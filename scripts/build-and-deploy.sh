#!/bin/bash

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Environment
SSH_HOST="${SSH_HOST}"
SSH_USER="${SSH_USER}"
SSH_PORT="${SSH_PORT:-22}"
SSH_PASSWORD="${SSH_PASSWORD}"
REMOTE_APP_DIR="/home/administrator/app2"

# Logging functions
log_info() { echo -e "${BLUE}ℹ${NC} $1"; }
log_success() { echo -e "${GREEN}✅${NC} $1"; }
log_warning() { echo -e "${YELLOW}⚠${NC} $1"; }
log_error() { echo -e "${RED}❌${NC} $1"; }

# Update version number
update_version() {
    log_info "Updating version number..."
    
    CURRENT_VERSION=$(grep '"version"' package.json | head -1 | sed 's/.*"version": "\([^"]*\)".*/\1/')
    log_info "Current version: $CURRENT_VERSION"
    
    IFS='.' read -r MAJOR MINOR PATCH <<< "$CURRENT_VERSION"
    NEW_PATCH=$((PATCH + 1))
    NEW_VERSION="$MAJOR.$MINOR.$NEW_PATCH"
    
    log_info "New version: $NEW_VERSION"
    
    # Update files locally
    sed -i "s/\"version\": \"$CURRENT_VERSION\"/\"version\": \"$NEW_VERSION\"/" package.json
    
    NEW_VERSION_CODE=$((MAJOR * 10000 + MINOR * 100 + NEW_PATCH))
    sed -i "s/versionCode [0-9]*/versionCode $NEW_VERSION_CODE/" android/app/build.gradle
    sed -i "s/versionName \"[^\"]*\"/versionName \"$NEW_VERSION\"/" android/app/build.gradle
    
    log_success "Version updated to $NEW_VERSION"
    echo "$NEW_VERSION"
}

# Transfer files to server
transfer_files_to_server() {
    local VERSION=$1
    log_info "Transferring files to server..."
    
    export SSHPASS="$SSH_PASSWORD"
    
    log_info "Creating archive..."
    tar --exclude='node_modules' \
        --exclude='dist' \
        --exclude='android/build' \
        --exclude='android/app/build' \
        --exclude='android/.gradle' \
        --exclude='.git' \
        --exclude='.gradle' \
        -czf /tmp/app-build-${VERSION}.tar.gz . 2>/dev/null || true
    
    if [ -f /tmp/app-build-${VERSION}.tar.gz ]; then
        SIZE=$(du -h /tmp/app-build-${VERSION}.tar.gz | cut -f1)
        log_info "Archive size: $SIZE"
        
        log_info "Uploading to server..."
        sshpass -e scp -P ${SSH_PORT} /tmp/app-build-${VERSION}.tar.gz ${SSH_USER}@${SSH_HOST}:/tmp/ 2>/dev/null
        log_success "Files transferred"
        rm -f /tmp/app-build-${VERSION}.tar.gz
    fi
}

# Build on remote server
trigger_build_on_server() {
    local VERSION=$1
    log_info "Starting build on server..."
    
    export SSHPASS="$SSH_PASSWORD"
    
    sshpass -e ssh -o StrictHostKeyChecking=no -p $SSH_PORT $SSH_USER@$SSH_HOST << REMOTE_CMD
#!/bin/bash
cd $REMOTE_APP_DIR

echo "📦 Extracting files..."
if [ -f "/tmp/app-build-${VERSION}.tar.gz" ]; then
    # Use --no-overwrite-dir and force overwrite for files
    tar -xzf /tmp/app-build-${VERSION}.tar.gz --overwrite
    rm -f /tmp/app-build-${VERSION}.tar.gz
    echo "✅ Files extracted"
fi

echo ""
echo "🔨 Building Web App First..."
export VITE_API_BASE_URL=https://app2.binarjoinanelytic.info
export NODE_ENV=production

npm run build 2>&1 | tail -10

if [ ! -d "dist" ]; then
    echo "❌ Build failed - dist folder not found"
    exit 1
fi

echo "✅ Web app built successfully"

cd android

echo ""
echo "🔨 Syncing Capacitor..."
npx cap sync android 2>&1 | tail -5
echo "✅ Capacitor synced"

echo ""
echo "🔨 Building APK - Version: $VERSION"
echo "⏳ This may take 2-3 minutes..."
echo ""

export JAVA_HOME=/usr/lib/jvm/java-21-openjdk-amd64
export PATH=\$JAVA_HOME/bin:\$PATH
export ANDROID_HOME=/opt/android-sdk

chmod +x gradlew
./gradlew --stop 2>/dev/null || true
sleep 2

# Build
if ./gradlew clean assembleDebug --no-daemon 2>&1 | tail -20; then
    if [ -f "app/build/outputs/apk/debug/app-debug.apk" ]; then
        echo ""
        echo "✅ Build successful - Version: $VERSION"
        echo ""
        ls -lh app/build/outputs/apk/debug/app-debug.apk
        exit 0
    fi
fi

echo "❌ Build failed"
exit 1

REMOTE_CMD
    
    return $?
}

# Main program
main() {
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║     🚀 BinarJoin Android Build & Deploy Script            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [ -z "$SSH_HOST" ] || [ -z "$SSH_USER" ] || [ -z "$SSH_PORT" ] || [ -z "$SSH_PASSWORD" ]; then
        log_error "SSH credentials incomplete"
        exit 1
    fi
    
    VERSION=$(update_version)
    echo ""
    transfer_files_to_server "$VERSION"
    echo ""
    
    if trigger_build_on_server "$VERSION"; then
        echo ""
        echo "╔════════════════════════════════════════════════════════════╗"
        echo "║                    ✅ BUILD SUCCESSFUL                     ║"
        echo "╚════════════════════════════════════════════════════════════╝"
        echo ""
        echo "  📦 Version: $VERSION"
        echo "  🖥️  Server: $SSH_USER@$SSH_HOST:$SSH_PORT"
        echo "  📱 APK: $REMOTE_APP_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
        echo ""
        exit 0
    else
        log_error "Build failed"
        exit 1
    fi
}

main "$@"
