# Close completed and duplicate Phase 1 issues
$repo = "nlekkerman/HotelMateFrontend"

Write-Host "Closing completed and duplicate issues..." -ForegroundColor Cyan

# Close remaining completed issues
gh issue close 31 --repo $repo --comment "Completed - Permission-based access control implemented"
gh issue close 33 --repo $repo --comment "Changed approach - View Public Page button in Settings"
gh issue close 34 --repo $repo --comment "Completed - Dual API save system with React Query"

Write-Host "Done! All duplicate and completed issues closed." -ForegroundColor Green
