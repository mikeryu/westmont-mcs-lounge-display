"""Pure signal/phrase logic, usable without microphone or speech dependencies."""
import math
import re

ACTIONS = {'pause': 'pause', 'resume': 'resume', 'next': 'next', 'previous': 'previous',
           'controls': 'controls', 'management': 'controls'}


class PhraseGate:
    def __init__(self, phrase='hey monty', confidence=.85, cooldown=3):
        self.phrase, self.confidence, self.cooldown = phrase.lower(), confidence, cooldown
        self.last = -float('inf')
        self.listening_until = 0
        self.last_wake = -float('inf')

    def accept(self, result, now):
        text = ' '.join(re.findall(r"[a-z']+", result.get('text', '').lower()))
        words = result.get('result', [])
        # Only final, confident recognition. Bare commands need a recent wake.
        if not words:
            return None
        if ' '.join(w.get('word', '') for w in words) != text:
            return None
        if any(w.get('conf', 0) < self.confidence for w in words):
            return None
        if text == self.phrase and now - self.last_wake >= 3:
            self.listening_until = now + 8
            self.last_wake = now
            return 'wake'
        if now < self.listening_until and text in ACTIONS:
            self.last = now
            self.listening_until = 0
            return ACTIONS[text]
        if now - self.last < self.cooldown:
            return None
        for word, action in ACTIONS.items():
            if text == f'{self.phrase} {word}':
                self.last = now
                self.listening_until = 0
                return action
        return None


class ToneGate:
    """Require a dominant 1800-Hz tone for 1.5 s, then silence before rearming."""
    def __init__(self, sample_rate=16000, frequency=1800, duration=1.5, cooldown=10):
        self.rate, self.frequency = sample_rate, frequency
        self.duration, self.cooldown = duration, cooldown
        self.held = 0
        self.last = -float('inf')
        self.armed = True
        self.quiet = 0

    def accept(self, samples, now):
        n = len(samples)
        if not n:
            return False
        mean = sum(samples)/n
        values = [v-mean for v in samples]
        energy = sum(v*v for v in values)
        coefficient = 2*math.cos(2*math.pi*self.frequency/self.rate)
        s1 = s2 = 0.
        for value in values:
            s0 = value + coefficient*s1 - s2
            s2, s1 = s1, s0
        power = s1*s1 + s2*s2 - coefficient*s1*s2
        purity = 2*power/(n*energy) if energy else 0
        detected = energy/n > 200**2 and purity > .80
        seconds = n/self.rate
        if not detected:
            self.held = 0
            self.quiet += seconds
            if self.quiet >= .5:
                self.armed = True
            return False
        self.quiet = 0
        self.held += seconds
        if self.armed and self.held >= self.duration and now-self.last >= self.cooldown:
            self.last, self.armed = now, False
            return True
        return False
