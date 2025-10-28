# 🏆 Memory Match Tournament - API Payload Documentation

## 📤 Tournament Score Submission

### **API Endpoint**
```
POST /entertainment/tournaments/{tournamentId}/submit_score/
```

### **Request Payload**
```json
{
  "player_name": "John Doe",
  "room_number": "205",  
  "time_seconds": 45,
  "moves_count": 18
}
```

### **Field Descriptions**
| Field | Type | Description | Example | Required |
|-------|------|-------------|---------|----------|
| `player_name` | string | Player's name or auto-generated ID | `"John Doe"` or `"Player 1234"` | ✅ |
| `room_number` | string | Hotel room number | `"205"` or `"Not specified"` | ✅ |
| `time_seconds` | integer | Total game completion time in seconds | `45` | ✅ |
| `moves_count` | integer | Number of card flips made during game | `18` | ✅ |

### **Expected Response**
```json
{
  "score": 850,
  "rank": 3,
  "message": "Great job! You're in 3rd place!"
}
```

### **Response Fields**
| Field | Type | Description |
|-------|------|-------------|
| `score` | integer | Calculated score based on time and moves |
| `rank` | integer | Player's current rank on leaderboard (optional) |
| `message` | string | Success message for the player (optional) |

---

## 🎮 Game Context

- **Game Type:** Memory Match (3×4 grid, 6 pairs, 12 cards)
- **Tournament Mode:** Anonymous play with leaderboard tracking
- **Score Calculation:** Based on completion time and number of moves
- **Target Users:** Kids tournament participants

---

## 🔧 Implementation Notes

1. **Auto-generated Names:** If player doesn't enter name, system generates `"Player {timestamp}"`
2. **Room Number Fallback:** Defaults to `"Not specified"` if not provided
3. **Error Handling:** Frontend shows success message even if API fails (for kids UX)
4. **Navigation:** Auto-redirects to games dashboard after 3 seconds

---

## ✅ Validation Requirements

- `player_name`: Must not be empty (min 1 character)
- `room_number`: Can be empty (defaults to "Not specified")
- `time_seconds`: Must be positive integer > 0
- `moves_count`: Must be positive integer > 0

---

**Generated:** October 28, 2025  
**Frontend Implementation:** React Memory Match Tournament System