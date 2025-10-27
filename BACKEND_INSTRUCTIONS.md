# Backend Instructions for Kids Memory Tournament with QR Code System

## Overview
The Memory Match game has been updated for kids with QR code access, mobile-optimized full-screen gameplay, and tournament management. No registration or money involved - purely for fun with symbolic rewards.

## QR Code Tournament Features
- Full-screen mobile gameplay when accessed via QR codes
- No navigation bars or headers (immersive gaming for kids)
- Tournament creation and QR code generation from frontend
- Anonymous player submission for kids tournaments
- Mobile-responsive design optimized for phones and tablets

## Required Backend Changes

### 1. Update Memory Game Session Model
The memory game sessions now use 12 pairs (24 cards) and include rules display:

```python
# Expected data format from frontend:
{
    "difficulty": "intermediate",  # Always intermediate for 6x4 grid (12 pairs)
    "time_seconds": 120,  # Longer time for more cards
    "moves_count": 24,    # More moves expected for 12 pairs
    "completed": True,
    "tournament": "kids-tournament",  # Generic tournament ID or specific tournament slug
    "player_name": "Player 1234",  # Anonymous player with timestamp
    "room_number": "Kids Tournament"  # Generic room identifier
}
```

### Game Rules System:
- Rules display automatically when tournament starts via QR code
- Rules button available during gameplay for reference
- Mobile-optimized rules modal for kids
- Updated for 12 pairs (24 cards) gameplay

### 2. Modify Tournament Validation
Remove any validation that requires:
- Real room number verification
- Guest registration checks  
- Payment processing
- Personal information validation

### 3. Anonymous Player Handling & Score Calculation
Update the memory session creation to handle 12-pair games:

```python
# In your memory session view/serializer:
def create_memory_session(self, validated_data):
    # Accept anonymous player names
    if validated_data.get('player_name', '').startswith('Player '):
        # This is an anonymous kids tournament entry
        validated_data['is_anonymous'] = True
    
    # Don't validate room numbers for "Kids Tournament"
    if validated_data.get('room_number') == "Kids Tournament":
        validated_data['room_validation_required'] = False
    
    return super().create(validated_data)

# Updated score calculation for 12 pairs:
def calculate_score(difficulty, time_seconds, moves_count):
    multipliers = {'easy': 1.0, 'intermediate': 1.5, 'hard': 2.0}
    optimal_moves = {'easy': 16, 'intermediate': 24, 'hard': 32}  # 12 pairs = 24 optimal moves
    
    base_score = multipliers[difficulty] * 1000
    time_penalty = time_seconds * 2
    moves_penalty = max(0, moves_count - optimal_moves[difficulty]) * 5
    
    return max(0, int(base_score - time_penalty - moves_penalty))
```

### 4. Tournament Leaderboard Adjustments
For kids tournaments, consider:
- Showing only first names or anonymous player numbers
- Adding fun emoji badges instead of monetary rewards
- Limiting leaderboard to recent games (e.g., last 24 hours)

### 5. API Endpoint Updates
Ensure these endpoints handle anonymous submissions:
- `POST /api/entertainment/memory-sessions/` (public API)
- `GET /api/entertainment/tournaments/{id}/leaderboard/` 

### 6. Tournament Management API Endpoints
Frontend now includes tournament creation and management. **URGENT: These endpoints are needed to fix the 500 errors:**

```python
# REQUIRED API endpoints (currently causing 500 errors):
POST /api/entertainment/tournaments/          # Create new tournament
GET  /api/entertainment/tournaments/          # List all tournaments  
GET  /api/entertainment/tournaments/{id}/     # Get tournament details
PATCH /api/entertainment/tournaments/{id}/    # Update tournament
GET  /api/entertainment/tournaments/{id}/leaderboard/  # Tournament leaderboard

# Tournament Model Example:
class KidsTournament(models.Model):
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    start_date = models.DateTimeField(null=True, blank=True)
    end_date = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"Kids Tournament: {self.name}"

# Tournament ViewSet Example:
class TournamentViewSet(viewsets.ModelViewSet):
    queryset = KidsTournament.objects.all()
    serializer_class = TournamentSerializer
    
    @action(detail=True, methods=['get'])
    def leaderboard(self, request, pk=None):
        tournament = self.get_object()
        # Get memory sessions for this tournament
        sessions = MemorySession.objects.filter(
            tournament=pk
        ).order_by('-score')[:10]
        return Response(sessions)
```

### 🚨 Current Status:
- Frontend is ready with mock data fallbacks
- Tournament dashboard shows development mode warning
- QR code generation works but needs backend for persistence
- All tournament API calls gracefully handle 404/500 errors

### 7. Reward System
Since this is for symbolic rewards only, you could add:
- Fun badges/achievements 
- Completion certificates
- Encouraging messages
- No monetary values or real prizes

### 8. Data Privacy Considerations
Since this involves kids:
- Don't store any real personal information
- Use anonymous player identifiers
- Consider auto-cleanup of old game sessions
- Ensure COPPA compliance if applicable

## QR Code Integration Details

### QR Code URLs Generated:
- **Play Tournament:** `/tournament/{tournament_id}` (full-screen mobile game)
- **View Champions:** `/tournament/{tournament_id}/leaderboard` (mobile-friendly leaderboard)

### QR Code Generation:
- Uses qr-server.com API (no npm package dependency required)
- 300x300 pixel QR codes optimized for mobile scanning
- Downloadable as PNG files for printing/sharing
- Works without external dependencies

### Mobile-First Design Considerations:
- QR codes take users to full-screen game (no navigation)
- Game layout optimized for 6x4 grid (12 pairs, 24 cards)
- Touch-friendly card sizes: `minmax(55px, 1fr)` on mobile
- Simplified UI with large, easy-to-read elements
- Automatic rules display when starting tournament via QR
- Rules access button always available during gameplay

## Frontend Integration Points
The frontend now sends:
- Anonymous player names (Player + timestamp)
- Generic room number "Kids Tournament"  
- No personal information collection
- Direct game start without registration form
- Tournament creation data from frontend dashboard
- QR code generation requests

## Testing Checklist
- [ ] **CRITICAL**: Implement tournament API endpoints to fix 500 errors
- [ ] Tournament CRUD operations (Create, Read, Update, Delete)
- [ ] Anonymous player sessions created successfully
- [ ] No validation errors for "Kids Tournament" room numbers
- [ ] Leaderboard displays anonymous players appropriately
- [ ] Public API accepts tournament submissions without authentication
- [ ] QR code tournament flow works on mobile devices
- [ ] Full-screen game mode works when accessed via QR codes
- [ ] Mobile-responsive layout on phones and tablets
- [ ] No personal data required or stored
- [ ] Tournament creation from frontend dashboard

## Error Resolution
**Current 500 Error Fix:**
1. Implement tournament model and viewset in Django
2. Add tournament URLs to urlpatterns
3. Create tournament serializers
4. Test tournament endpoints with Postman/curl
5. Frontend will automatically switch from mock data to real API

## Migration Notes
If you have existing tournament data:
- Consider flagging existing sessions as "adult tournaments" 
- Create separate leaderboards for kids vs adult tournaments
- Update any existing validation rules

## Frontend Mobile Optimizations Implemented

### Full-Screen QR Tournament Mode:
- `position-fixed` layout when accessed via tournament QR code
- `z-index: 1050` to cover all navigation elements  
- Responsive grid: `minmax(70px, 1fr)` for flexible card sizing
- Viewport optimization: `95vw` max width for mobile screens
- Touch-friendly gaps: `0.8rem` between cards on mobile

### Responsive UI Elements:
- Compact info display for mobile (time, moves, found pairs)
- Dynamic pair counter: shows `X/12` pairs found
- `bg-opacity-90` overlays for readability on gradient backgrounds
- Flexible 6x4 card grid that adapts to screen size
- Portrait and landscape mode support
- Rules modal with mobile-optimized layout

### Kids-Friendly Design:
- Large, colorful buttons and text
- Emoji-rich interface for engagement  
- Simple, clear instructions
- Encouraging success messages
- No complex forms or inputs required

This ensures the game is fun, safe, and perfectly suited for kids playing on phones and tablets via QR codes, while maintaining the competitive spirit with symbolic rewards only.