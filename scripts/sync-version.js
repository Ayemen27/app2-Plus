import fs from 'fs';
import path from 'path';

const packageJsonPath = path.resolve('package.json');
const buildGradlePath = path.resolve('android/app/build.gradle');

function syncVersion() {
    try {
        const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
        const version = packageJson.version;
        // Convert version 1.0.27 to numeric code (e.g., 27)
        const versionCode = parseInt(version.split('.').pop()) || 1;

        let gradleContent = fs.readFileSync(buildGradlePath, 'utf8');

        // Update versionCode
        gradleContent = gradleContent.replace(/versionCode \d+/, `versionCode ${versionCode}`);
        // Update versionName
        gradleContent = gradleContent.replace(/versionName "[^"]+"/, `versionName "${version}"`);

        fs.writeFileSync(buildGradlePath, gradleContent);
        console.log(`✅ Synced Android version to ${version} (code: ${versionCode})`);
    } catch (error) {
        console.error('❌ Error syncing version:', error.message);
    }
}

syncVersion();
