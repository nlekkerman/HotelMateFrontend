# 🎮 Backend Tournament Management Instructions

## 📋 **Tournament CRUD Operations**

### **🏆 Create New Tournaments**

#### **API Endpoint:**
```
POST /api/entertainment/tournaments/
```

#### **Request Body:**
```json
{
  "name": "Kids Memory Challenge - November 1st",
  "slug": "kids-memory-2025-11-01", 
  "description": "Daily kids memory tournament for November 1, 2025. 6 pairs (12 cards) - Perfect for young minds!",
  "hotel": 2,  // Hotel ID
  "difficulty": "intermediate",
  "grid_size": "3x4 (6 pairs)",
  "start_date": "2025-11-01T12:00:00Z",
  "end_date": "2025-11-01T19:00:00Z",
  "max_participants": 999,
  "is_active": true,
  "status": "upcoming"
}
```

#### **Django Admin Command:**
```python
# Create tournament via Django shell
python manage.py shell

from entertainment.models import Tournament, Hotel
from datetime import datetime
import pytz

# Get hotel
hotel = Hotel.objects.get(slug='hotel-killarney')

# Create tournament
tournament = Tournament.objects.create(
    name="Kids Memory Challenge - November 1st",
    slug="kids-memory-2025-11-01",
    description="Daily kids memory tournament for November 1, 2025. 6 pairs (12 cards) - Perfect for young minds!",
    hotel=hotel,
    difficulty="intermediate", 
    grid_size="3x4 (6 pairs)",
    start_date=datetime(2025, 11, 1, 12, 0, 0, tzinfo=pytz.UTC),
    end_date=datetime(2025, 11, 1, 19, 0, 0, tzinfo=pytz.UTC),
    max_participants=999,
    is_active=True,
    status="upcoming"
)

print(f"Created tournament: {tournament.name} (ID: {tournament.id})")
```

### **🗑️ Delete Old Tournaments**

#### **API Endpoint:**
```
DELETE /api/entertainment/tournaments/{id}/
```

#### **Django Admin Command:**
```python
# Delete tournaments via Django shell
python manage.py shell

from entertainment.models import Tournament
from datetime import datetime, timedelta
import pytz

# Delete tournaments older than 30 days
cutoff_date = datetime.now(pytz.UTC) - timedelta(days=30)
old_tournaments = Tournament.objects.filter(end_date__lt=cutoff_date)

print(f"Found {old_tournaments.count()} old tournaments")
for tournament in old_tournaments:
    print(f"Deleting: {tournament.name} (ended: {tournament.end_date})")
    tournament.delete()

print("Cleanup complete!")
```

#### **Bulk Delete by Status:**
```python
# Delete all 'ended' tournaments
Tournament.objects.filter(status='ended').delete()

# Delete specific tournament by slug
Tournament.objects.filter(slug='kids-memory-2025-10-27').delete()

# Delete tournaments for specific hotel
hotel = Hotel.objects.get(slug='hotel-killarney')
Tournament.objects.filter(hotel=hotel, status='ended').delete()
```

### **📅 Bulk Create Weekly Tournaments**

#### **Create 7-Day Tournament Series:**
```python
# Create a week of tournaments
python manage.py shell

from entertainment.models import Tournament, Hotel
from datetime import datetime, timedelta
import pytz

hotel = Hotel.objects.get(slug='hotel-killarney')
start_date = datetime(2025, 11, 1, 12, 0, 0, tzinfo=pytz.UTC)  # Start November 1st

tournaments = []
for day in range(7):  # Create 7 tournaments
    current_date = start_date + timedelta(days=day)
    end_date = current_date.replace(hour=19)  # End at 7 PM
    
    day_name = current_date.strftime('%A')  # Monday, Tuesday, etc.
    
    tournament = Tournament.objects.create(
        name=f"Kids Memory Challenge - {day_name}",
        slug=f"kids-memory-{current_date.strftime('%Y-%m-%d')}",
        description=f"Daily kids memory tournament for {current_date.strftime('%B %d, %Y')}. 6 pairs (12 cards) - Play anonymously, enter name after!",
        hotel=hotel,
        difficulty="intermediate",
        grid_size="3x4 (6 pairs)",
        start_date=current_date,
        end_date=end_date,
        max_participants=999,
        is_active=True,
        status="upcoming"
    )
    tournaments.append(tournament)
    print(f"Created: {tournament.name} ({tournament.start_date.strftime('%Y-%m-%d')})")

print(f"Successfully created {len(tournaments)} tournaments!")
```

### **🔄 Update Tournament Status**

#### **Auto-Update Status Based on Time:**
```python
# Django management command to update tournament statuses
# Save as: management/commands/update_tournament_status.py

from django.core.management.base import BaseCommand
from entertainment.models import Tournament
from django.utils import timezone

class Command(BaseCommand):
    help = 'Update tournament statuses based on current time'
    
    def handle(self, *args, **options):
        now = timezone.now()
        
        # Set upcoming tournaments to active if start time has passed
        upcoming_tournaments = Tournament.objects.filter(
            status='upcoming',
            start_date__lte=now,
            end_date__gt=now
        )
        upcoming_count = upcoming_tournaments.update(status='active')
        
        # Set active tournaments to ended if end time has passed  
        active_tournaments = Tournament.objects.filter(
            status='active',
            end_date__lte=now
        )
        ended_count = active_tournaments.update(status='ended')
        
        self.stdout.write(
            self.style.SUCCESS(
                f'Updated {upcoming_count} tournaments to active, '
                f'{ended_count} tournaments to ended'
            )
        )

# Run with: python manage.py update_tournament_status
```

#### **Manual Status Update:**
```python
# Update specific tournament
tournament = Tournament.objects.get(slug='kids-memory-2025-11-01')
tournament.status = 'active'  # or 'upcoming', 'ended'
tournament.is_active = True   # or False
tournament.save()
```

### **📊 Tournament Analytics & Cleanup**

#### **Get Tournament Statistics:**
```python
from entertainment.models import Tournament, MemoryGameSession
from django.db.models import Count, Avg

# Tournament participation stats
tournaments = Tournament.objects.annotate(
    session_count=Count('memorygamesession'),
    avg_score=Avg('memorygamesession__score')
).order_by('-start_date')

for tournament in tournaments:
    print(f"{tournament.name}: {tournament.session_count} players, avg score: {tournament.avg_score}")
```

#### **Cleanup Old Tournament Data:**
```python
# Delete tournaments and their sessions older than 90 days
from datetime import datetime, timedelta
import pytz

cutoff_date = datetime.now(pytz.UTC) - timedelta(days=90)

# Delete sessions first (foreign key constraint)
old_sessions = MemoryGameSession.objects.filter(
    tournament__end_date__lt=cutoff_date
)
session_count = old_sessions.count()
old_sessions.delete()

# Then delete tournaments
old_tournaments = Tournament.objects.filter(end_date__lt=cutoff_date)
tournament_count = old_tournaments.count() 
old_tournaments.delete()

print(f"Deleted {session_count} old sessions and {tournament_count} old tournaments")
```

## 🎯 **API Endpoints Summary**

### **Tournament Management:**
- `GET /api/entertainment/tournaments/` - List all tournaments
- `POST /api/entertainment/tournaments/` - Create tournament
- `GET /api/entertainment/tournaments/{id}/` - Get tournament details
- `PATCH /api/entertainment/tournaments/{id}/` - Update tournament
- `DELETE /api/entertainment/tournaments/{id}/` - Delete tournament

### **Tournament Operations:**
- `GET /api/entertainment/tournaments/active/?hotel=hotel-killarney` - Get active tournaments for hotel
- `POST /api/entertainment/tournaments/{id}/submit_score/` - Submit player score
- `GET /api/entertainment/tournaments/{id}/leaderboard/` - Get tournament leaderboard
- `POST /api/entertainment/tournaments/{id}/generate_qr_code/` - Generate QR code

## ⏰ **Automated Tournament Management**

### **Cron Job Setup (Linux/Mac):**
```bash
# Add to crontab (crontab -e)
# Update tournament statuses every 5 minutes
*/5 * * * * cd /path/to/project && python manage.py update_tournament_status

# Daily cleanup at 2 AM
0 2 * * * cd /path/to/project && python manage.py shell -c "
from entertainment.models import Tournament;
from datetime import datetime, timedelta;
import pytz;
cutoff = datetime.now(pytz.UTC) - timedelta(days=30);
Tournament.objects.filter(end_date__lt=cutoff, status='ended').delete()
"
```

### **Django Celery Task (Recommended):**
```python
# tasks.py
from celery import shared_task
from .models import Tournament
from django.utils import timezone
from datetime import timedelta

@shared_task
def update_tournament_statuses():
    now = timezone.now()
    
    # Update to active
    upcoming = Tournament.objects.filter(
        status='upcoming', start_date__lte=now, end_date__gt=now
    ).update(status='active')
    
    # Update to ended
    ended = Tournament.objects.filter(
        status='active', end_date__lte=now
    ).update(status='ended')
    
    return f"Updated {upcoming} to active, {ended} to ended"

@shared_task  
def cleanup_old_tournaments():
    cutoff = timezone.now() - timedelta(days=30)
    count = Tournament.objects.filter(
        end_date__lt=cutoff, status='ended'
    ).count()
    Tournament.objects.filter(
        end_date__lt=cutoff, status='ended'
    ).delete()
    return f"Deleted {count} old tournaments"
```

## 🚀 **Quick Commands**

### **Create Today's Tournament:**
```python
from entertainment.models import Tournament, Hotel
from datetime import datetime
import pytz

hotel = Hotel.objects.get(slug='hotel-killarney')
today = datetime.now(pytz.UTC).replace(hour=12, minute=0, second=0, microsecond=0)
end_time = today.replace(hour=19)

Tournament.objects.create(
    name=f"Kids Memory Challenge - {today.strftime('%B %d')}",
    slug=f"kids-memory-{today.strftime('%Y-%m-%d')}",
    description=f"Daily memory tournament for {today.strftime('%B %d, %Y')}. 6 pairs, play anonymously!",
    hotel=hotel,
    difficulty="intermediate",
    grid_size="3x4 (6 pairs)", 
    start_date=today,
    end_date=end_time,
    max_participants=999,
    is_active=True,
    status="active" if datetime.now(pytz.UTC) >= today else "upcoming"
)
```

### **Delete All Test Tournaments:**
```python
Tournament.objects.filter(name__icontains='test').delete()
Tournament.objects.filter(description__icontains='test').delete()
```

This gives you complete control over tournament lifecycle management! 🎯