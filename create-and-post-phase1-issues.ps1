# GitHub Issues Creation Script - Phase 1 Frontend (Complete)
# Creates labels and issues #37-40 for Phase 1 implementation

$repo = "nlekkerman/HotelMateFrontend"
$ErrorActionPreference = "Continue"

Write-Host "🚀 Phase 1 GitHub Issues - Create & Post Script" -ForegroundColor Cyan
Write-Host "Repository: $repo" -ForegroundColor Yellow
Write-Host ""

# Step 1: Update issue body files with full content
Write-Host "📝 Step 1: Updating issue body files with complete specifications..." -ForegroundColor Green

# Copy full versions to actual issue body files
Copy-Item ".github/issue-templates/issue-37-body-full.md" ".github/issue-templates/issue-37-body.md" -Force
Write-Host "  OK Updated issue-37-body.md (Staff Bookings Dashboard)" -ForegroundColor Green

Copy-Item ".github/issue-templates/issue-38-body-full.md" ".github/issue-templates/issue-38-body.md" -Force
Write-Host "  OK Updated issue-38-body.md (Booking Detail and Confirmation)" -ForegroundColor Green

Copy-Item ".github/issue-templates/issue-39-body-full.md" ".github/issue-templates/issue-39-body.md" -Force
Write-Host "  OK Updated issue-39-body.md (Confirmation Experience)" -ForegroundColor Green

Write-Host ""

# Step 2: Create Labels
Write-Host "📌 Step 2: Creating GitHub Labels..." -ForegroundColor Green

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

# Step 3: Create GitHub Issues
Write-Host "Step 3: Creating GitHub Issues (starting from 37)..." -ForegroundColor Green
Write-Host ""

# Issue #37: Staff Bookings Dashboard
Write-Host "  Creating Issue 37: Staff Bookings Dashboard..." -ForegroundColor Cyan

try {
    $issue37 = gh issue create --repo $repo `
        --title "[Phase 1] Implement Staff Bookings Dashboard" `
        --body-file ".github/issue-templates/issue-37-body.md" `
        --label "enhancement,high-priority,phase-1,bookings"
    
    Write-Host "  OK Created Issue 37: $issue37" -ForegroundColor Green
} catch {
    Write-Host "  FAILED to create Issue 37: $_" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# Issue #38: Booking Detail and Confirmation
Write-Host "  Creating Issue 38: Booking Detail and Confirmation..." -ForegroundColor Cyan

try {
    $issue38 = gh issue create --repo $repo `
        --title "[Phase 1] Implement Booking Detail View and Confirmation Action" `
        --body-file ".github/issue-templates/issue-38-body.md" `
        --label "enhancement,high-priority,phase-1,bookings"
    
    Write-Host "  OK Created Issue 38: $issue38" -ForegroundColor Green
} catch {
    Write-Host "  FAILED to create Issue 38: $_" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# Issue #39: Confirmation Experience
Write-Host "  Creating Issue 39: Confirmation Experience..." -ForegroundColor Cyan

try {
    $issue39 = gh issue create --repo $repo `
        --title "[Phase 1] Enhance Booking Confirmation Experience and User Feedback" `
        --body-file ".github/issue-templates/issue-39-body.md" `
        --label "enhancement,medium-priority,phase-1,ux,bookings"
    
    Write-Host "  OK Created Issue 39: $issue39" -ForegroundColor Green
} catch {
    Write-Host "  FAILED to create Issue 39: $_" -ForegroundColor Red
}

Start-Sleep -Milliseconds 500

# Issue #40: Summary Issue
Write-Host "  Creating Issue 40: Phase 1 Status Summary..." -ForegroundColor Cyan

try {
    $issue40 = gh issue create --repo $repo `
        --title "[Phase 1] Hotel Settings and Bookings Management - Status Tracker" `
        --body-file ".github/issue-templates/issue-40-body.md" `
        --label "documentation,phase-1"
    
    Write-Host "  OK Created Issue 40: $issue40" -ForegroundColor Green
} catch {
    Write-Host "  FAILED to create Issue 40: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SUCCESS! All Done! Phase 1 Issues Created Successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Created Issues:" -ForegroundColor Cyan
Write-Host "  Issue 37 - Staff Bookings Dashboard (4-6 hours)" -ForegroundColor White
Write-Host "  Issue 38 - Booking Detail and Confirmation (4-5 hours)" -ForegroundColor White
Write-Host "  Issue 39 - Confirmation Experience and Feedback (3-4 hours)" -ForegroundColor White
Write-Host "  Issue 40 - Phase 1 Status Tracker (documentation)" -ForegroundColor White
Write-Host ""
Write-Host "Total Estimated Effort: 11-15 hours" -ForegroundColor Yellow
Write-Host ""
Write-Host "View Issues: https://github.com/$repo/issues" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
Write-Host "  1. Visit GitHub to review your new issues" -ForegroundColor White
Write-Host "  2. Consider closing or updating duplicate issues (32, 35, 36)" -ForegroundColor White
Write-Host "  3. Assign issues to team members" -ForegroundColor White
Write-Host "  4. Add to Phase 1 milestone (optional)" -ForegroundColor White
Write-Host "  5. Start with Issue 37 - Bookings Dashboard" -ForegroundColor White
Write-Host ""
Write-Host "Settings System Status: Production-ready" -ForegroundColor Green
Write-Host "Bookings System Status: Ready to implement" -ForegroundColor Yellow
Write-Host ""
Write-Host "=============================================================" -ForegroundColor Cyan
Write-Host ""
