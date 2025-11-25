# GitHub Issues Creation Script - Phase 1 Frontend
# Creates labels and issues #37-40 for Phase 1 implementation

$repo = "nlekkerman/HotelMateFrontend"
$ErrorActionPreference = "Continue"

Write-Host "🚀 Creating GitHub Labels and Issues for Phase 1" -ForegroundColor Cyan
Write-Host "Repository: $repo" -ForegroundColor Yellow
Write-Host ""

# Step 1: Create Labels
Write-Host "📌 Step 1: Creating Labels..." -ForegroundColor Green

$labels = @(
    @{name="phase-1"; color="0E8A16"; description="Phase 1 implementation tasks"},
    @{name="high-priority"; color="D93F0B"; description="High priority - critical for Phase 1"},
    @{name="medium-priority"; color="FBCA04"; description="Medium priority - important but not blocking"},
    @{name="low-priority"; color="C5DEF5"; description="Low priority - nice to have"},
    @{name="enhancement"; color="A2EEEF"; description="New feature or request"},
    @{name="ux"; color="D876E3"; description="User experience improvements"},
    @{name="documentation"; color="0075CA"; description="Documentation updates"},
    @{name="bookings"; color="1D76DB"; description="Bookings management related"},
    @{name="settings"; color="5319E7"; description="Settings management related"}
)

foreach ($label in $labels) {
    try {
        gh label create $label.name --repo $repo --color $label.color --description $label.description 2>$null
        Write-Host "  ✅ Created label: $($label.name)" -ForegroundColor Green
    } catch {
        Write-Host "  ⏭️  Label '$($label.name)' already exists" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "📝 Step 2: Creating Issues (starting from #37)..." -ForegroundColor Green

# Issue #37: Staff Bookings Dashboard (Enhanced)
Write-Host "  Creating Issue #37: Staff Bookings Dashboard..." -ForegroundColor Cyan

try {
    $issue37 = gh issue create --repo $repo `
        --title "[Phase 1] Implement Staff Bookings Dashboard" `
        --body-file ".github/issue-templates/issue-37-body.md" `
        --label "enhancement,high-priority,phase-1,bookings"
    
    Write-Host "  ✅ Created Issue #37: $issue37" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to create Issue #37: $_" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# Issue #38: Booking Detail & Confirmation
Write-Host "  Creating Issue #38: Booking Detail & Confirmation..." -ForegroundColor Cyan

try {
    $issue38 = gh issue create --repo $repo `
        --title "[Phase 1] Implement Booking Detail View & Confirmation Action" `
        --body-file ".github/issue-templates/issue-38-body.md" `
        --label "enhancement,high-priority,phase-1,bookings"
    
    Write-Host "  ✅ Created Issue #38: $issue38" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to create Issue #38: $_" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# Issue #39: Confirmation Experience
Write-Host "  Creating Issue #39: Confirmation Experience..." -ForegroundColor Cyan

try {
    $issue39 = gh issue create --repo $repo `
        --title "[Phase 1] Enhance Booking Confirmation Experience & User Feedback" `
        --body-file ".github/issue-templates/issue-39-body.md" `
        --label "enhancement,medium-priority,phase-1,ux,bookings"
    
    Write-Host "  ✅ Created Issue #39: $issue39" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to create Issue #39: $_" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# Issue #40: Summary Issue
Write-Host "  Creating Issue #40: Phase 1 Status Summary..." -ForegroundColor Cyan

try {
    $issue40 = gh issue create --repo $repo `
        --title "[Phase 1] Hotel Settings & Bookings Management - Status Tracker" `
        --body-file ".github/issue-templates/issue-40-body.md" `
        --label "documentation,phase-1"
    
    Write-Host "  ✅ Created Issue #40: $issue40" -ForegroundColor Green
} catch {
    Write-Host "  ❌ Failed to create Issue #40: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 Done! All labels and issues created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📌 Created Issues:" -ForegroundColor Cyan
Write-Host "  #37 - Staff Bookings Dashboard" -ForegroundColor White
Write-Host "  #38 - Booking Detail & Confirmation" -ForegroundColor White
Write-Host "  #39 - Confirmation Experience & Feedback" -ForegroundColor White
Write-Host "  #40 - Phase 1 Status Tracker" -ForegroundColor White
Write-Host ""
Write-Host "📌 Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Visit https://github.com/$repo/issues to see your new issues" -ForegroundColor White
Write-Host "  2. Consider closing/updating duplicate issues" -ForegroundColor White
Write-Host "  3. Assign issues to team members" -ForegroundColor White
Write-Host "  4. Add to Phase 1 milestone if needed" -ForegroundColor White
Write-Host "  5. Start with Issue #37 - Bookings Dashboard" -ForegroundColor White
Write-Host ""
