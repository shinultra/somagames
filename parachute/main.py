import pygame
import random
import numpy as np
import math

# --- Constants ---
SCREEN_WIDTH = 800
SCREEN_HEIGHT = 600
FPS = 60

# Colors
WHITE = (255, 255, 255)
BLACK = (0, 0, 0)
SKY_BLUE = (135, 206, 235)
GROUND_COLOR = (34, 139, 34)
TEXT_COLOR = (0, 0, 0)

# Game Settings
GAME_DURATION_SEC = 120
SCROLL_SPEED = 3  # Pixels per frame
PLAYER_SPEED = 5
SPAWN_INTERVAL = 60 # Frames

# --- Audio Synthesis ---
def generate_tone(frequency, duration, volume=0.5, wave_type='sine'):
    sample_rate = 44100
    n_samples = int(sample_rate * duration)
    t = np.linspace(0, duration, n_samples, False)
    
    if wave_type == 'sine':
        wave = np.sin(2 * np.pi * frequency * t)
    elif wave_type == 'square':
        wave = np.sign(np.sin(2 * np.pi * frequency * t))
    elif wave_type == 'sawtooth':
        wave = 2 * (t * frequency - np.floor(t * frequency + 0.5))
    elif wave_type == 'noise':
        wave = np.random.uniform(-1, 1, n_samples)
    else:
        wave = np.zeros(n_samples)
        
    # Envelope (Attack/Decay)
    attack = int(sample_rate * 0.01)
    decay = int(sample_rate * 0.1)
    
    envelope = np.ones(n_samples)
    if n_samples > attack + decay:
        envelope[:attack] = np.linspace(0, 1, attack)
        envelope[-decay:] = np.linspace(1, 0, decay)
    
    wave = wave * envelope * volume
    
    # Convert to 16-bit integer
    audio = (wave * 32767).astype(np.int16)
    
    # Check for stereo
    if pygame.mixer.get_init() and pygame.mixer.get_num_channels() == 2:
        audio = np.column_stack((audio, audio))
        
    return pygame.sndarray.make_sound(audio)

class AudioManager:
    def __init__(self):
        self.sounds = {}
        self.bgm_notes = [
            (261.63, 0.2), (329.63, 0.2), (392.00, 0.2), (523.25, 0.4), # C major arpeggio
            (392.00, 0.2), (329.63, 0.2), (261.63, 0.4),
            (293.66, 0.2), (349.23, 0.2), (440.00, 0.2), (587.33, 0.4), # D minor
            (440.00, 0.2), (349.23, 0.2), (293.66, 0.4)
        ]
        self.bgm_index = 0
        self.bgm_timer = 0
        self.is_playing_bgm = True

    def init_sounds(self):
        self.sounds['collect'] = generate_tone(880, 0.1, 0.3, 'sine')
        self.sounds['hit'] = generate_tone(110, 0.3, 0.5, 'sawtooth')
        self.sounds['gameover'] = generate_tone(55, 1.0, 0.6, 'square')
        self.sounds['win'] = generate_tone(523.25, 0.5, 0.4, 'sine')

    def play(self, name):
        if name in self.sounds:
            self.sounds[name].play()
            
    def update_bgm(self):
        if not self.is_playing_bgm: return
        
        self.bgm_timer -= 1
        if self.bgm_timer <= 0:
            freq, duration = self.bgm_notes[self.bgm_index]
            sound = generate_tone(freq, duration, 0.1, 'sine')
            sound.play()
            
            self.bgm_timer = int(duration * FPS)
            self.bgm_index = (self.bgm_index + 1) % len(self.bgm_notes)

# --- Game Objects ---
class Player(pygame.sprite.Sprite):
    def __init__(self):
        super().__init__()
        self.image = pygame.Surface((40, 60))
        self.image.fill(WHITE) # Placeholder
        self.image.set_colorkey(WHITE)
        
        # Draw Parachute
        pygame.draw.arc(self.image, (255, 0, 0), (0, 0, 40, 40), 0, math.pi, 5)
        # Draw Person
        pygame.draw.rect(self.image, (0, 0, 255), (15, 40, 10, 20))
        # Strings
        pygame.draw.line(self.image, BLACK, (5, 20), (15, 40), 1)
        pygame.draw.line(self.image, BLACK, (35, 20), (25, 40), 1)
        
        self.rect = self.image.get_rect()
        self.rect.centerx = SCREEN_WIDTH // 2
        self.rect.top = 100
        
    def update(self):
        keys = pygame.key.get_pressed()
        if keys[pygame.K_LEFT]:
            self.rect.x -= PLAYER_SPEED
        if keys[pygame.K_RIGHT]:
            self.rect.x += PLAYER_SPEED
            
        # Clamp to screen
        if self.rect.left < 0: self.rect.left = 0
        if self.rect.right > SCREEN_WIDTH: self.rect.right = SCREEN_WIDTH

class GameObject(pygame.sprite.Sprite):
    def __init__(self, obj_type):
        super().__init__()
        self.type = obj_type
        self.image = pygame.Surface((40, 40), pygame.SRCALPHA)
        
        if self.type == 'candy':
            pygame.draw.circle(self.image, (255, 105, 180), (20, 20), 15) # Pink Candy
            self.points = 100
        elif self.type == 'umbrella':
             # Red Umbrella
            pygame.draw.arc(self.image, (255, 0, 0), (5, 10, 30, 20), 0, math.pi, 3)
            pygame.draw.line(self.image, BLACK, (20, 10), (20, 35), 2)
            pygame.draw.arc(self.image, BLACK, (15, 30, 10, 10), math.pi, 0, 2)
            self.points = 100
        elif self.type == 'meteor':
            pygame.draw.circle(self.image, (100, 100, 100), (20, 20), 18) # Gray rock
            pygame.draw.circle(self.image, (50, 50, 50), (15, 15), 5)
            self.points = -100
            
        self.rect = self.image.get_rect()
        self.rect.x = random.randint(0, SCREEN_WIDTH - self.rect.width)
        self.rect.y = SCREEN_HEIGHT + 20 # Start below screen
        
    def update(self):
        self.rect.y -= SCROLL_SPEED
        # Kill if off top
        if self.rect.bottom < 0:
            self.kill()

# --- Main Game ---
def main():
    try:
        pygame.init()
        pygame.mixer.init(frequency=44100, size=-16, channels=2, buffer=512)
    except Exception as e:
        print(f"Could not initialize pygame/mixer: {e}")
        return

    screen = pygame.display.set_mode((SCREEN_WIDTH, SCREEN_HEIGHT))
    pygame.display.set_caption("Parachute Adventure")
    clock = pygame.time.Clock()
    font = pygame.font.SysFont('Arial', 30)
    
    # Audio
    audio = AudioManager()
    audio.init_sounds()
    
    # Sprites
    player = Player()
    all_sprites = pygame.sprite.Group(player)
    objects = pygame.sprite.Group()
    
    # Variables
    score = 0
    frames_elapsed = 0
    max_frames = GAME_DURATION_SEC * FPS
    game_state = 'playing' # playing, gameover, win
    
    running = True
    while running:
        # Event Loop
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
        
        if game_state == 'playing':
            # Update Logic
            frames_elapsed += 1
            progress = frames_elapsed / max_frames
            
            # Spawn Objects
            if frames_elapsed % SPAWN_INTERVAL == 0:
                obj_type = random.choice(['candy', 'candy', 'umbrella', 'meteor', 'meteor'])
                obj = GameObject(obj_type)
                objects.add(obj)
                all_sprites.add(obj)
            
            # Updates
            all_sprites.update()
            audio.update_bgm()
            
            # Collisions
            hits = pygame.sprite.spritecollide(player, objects, True)
            for hit in hits:
                score += hit.points
                if hit.points > 0:
                    audio.play('collect')
                else:
                    audio.play('hit')
            
            # Game Over Check
            if score < 0:
                game_state = 'gameover'
                audio.is_playing_bgm = False
                audio.play('gameover')
            
            # Win Check
            if frames_elapsed >= max_frames:
                game_state = 'win'
                audio.is_playing_bgm = False
                audio.play('win')
                
        # Drawing
        screen.fill(SKY_BLUE)
        
        # Draw Ground if near end
        ground_offset = 0
        remaining_pixels = (max_frames - frames_elapsed) * (SCREEN_HEIGHT / max_frames) * 2 # Crude approx
        # Actually simpler: Just rely on progress.
        # If we want visual ground approaching:
        ground_y = (1 - (frames_elapsed / max_frames)) * (SCREEN_HEIGHT * 10) + SCREEN_HEIGHT * 0.8
        if ground_y < SCREEN_HEIGHT:
            pygame.draw.rect(screen, GROUND_COLOR, (0, ground_y, SCREEN_WIDTH, SCREEN_HEIGHT))
            
        all_sprites.draw(screen)
        
        # UI
        score_text = font.render(f"Score: {score}", True, TEXT_COLOR)
        screen.blit(score_text, (10, 10))
        
        time_text = font.render(f"Time: {int(GAME_DURATION_SEC - frames_elapsed/FPS)}s", True, TEXT_COLOR)
        screen.blit(time_text, (SCREEN_WIDTH - 150, 10))
        
        if game_state == 'gameover':
            go_text = font.render("GAME OVER", True, (255, 0, 0))
            rect = go_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2))
            screen.blit(go_text, rect)
        
        if game_state == 'win':
            win_text = font.render(f"FINISH! Final Score: {score}", True, (0, 100, 0))
            rect = win_text.get_rect(center=(SCREEN_WIDTH//2, SCREEN_HEIGHT//2))
            screen.blit(win_text, rect)

        pygame.display.flip()
        clock.tick(FPS)

    pygame.quit()

if __name__ == "__main__":
    main()
