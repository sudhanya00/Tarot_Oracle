const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGoogleServices = (config) => {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const googleServicesPath = path.join(config.modRequest.platformProjectRoot, 'app', 'google-services.json');
      const rootGoogleServicesPath = path.join(config.modRequest.projectRoot, 'google-services.json');
      
      // Copy google-services.json from project root to android/app if it exists
      if (fs.existsSync(rootGoogleServicesPath)) {
        // Ensure directory exists
        const dir = path.dirname(googleServicesPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        
        // Copy the file
        fs.copyFileSync(rootGoogleServicesPath, googleServicesPath);
        console.log('✓ Copied google-services.json to android/app');
      } else {
        console.warn('⚠ google-services.json not found in project root');
      }
      
      return config;
    },
  ]);
};

module.exports = withGoogleServices;
