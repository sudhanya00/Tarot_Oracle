# Script to copy all environment variables from preview to development
# Run this with: .\copy-env-to-dev.ps1

$envVars = @(
    "OPENAI_API_KEY",
    "STRIPE_PUBLISHABLE_KEY",
    "STRIPE_PRICE_ID",
    "ADMOB_BANNER_ID",
    "ADMOB_APP_ID_ANDROID",
    "ADMOB_APP_ID_IOS",
    "FIREBASE_API_KEY",
    "FIREBASE_AUTH_DOMAIN",
    "FIREBASE_PROJECT_ID",
    "FIREBASE_STORAGE_BUCKET",
    "FIREBASE_MESSAGING_SENDER_ID",
    "FIREBASE_APP_ID",
    "FIREBASE_APP_ID_ANDROID",
    "FIREBASE_APP_ID_WEB",
    "FIREBASE_APP_ID_IOS",
    "FIREBASE_MEASUREMENT_ID",
    "FIREBASE_CLIENT_ID",
    "GOOGLE_WEB_CLIENT_ID"
)

Write-Host "This script will copy environment variables from preview to development" -ForegroundColor Cyan
Write-Host "You'll need to select 'Sensitive' visibility for each variable" -ForegroundColor Yellow
Write-Host ""

foreach ($var in $envVars) {
    Write-Host "Creating $var in development environment..." -ForegroundColor Green
    
    # Get value from .env file (assumes .env is in current directory)
    $value = (Get-Content .env | Select-String "^$var=").ToString().Split('=', 2)[1].Trim('"')
    
    if ($value) {
        eas env:create --name $var --value $value --environment development
    } else {
        Write-Host "Warning: $var not found in .env file" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "Done! All variables copied to development environment." -ForegroundColor Green
