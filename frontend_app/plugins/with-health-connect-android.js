const { AndroidConfig, withAndroidManifest, withMainActivity } = require("@expo/config-plugins");

const READ_STEPS_PERMISSION = "android.permission.health.READ_STEPS";
const RATIONALE_ACTION = "androidx.health.ACTION_SHOW_PERMISSIONS_RATIONALE";
const VIEW_PERMISSION_USAGE_ACTION = "android.intent.action.VIEW_PERMISSION_USAGE";
const HEALTH_PERMISSIONS_CATEGORY = "android.intent.category.HEALTH_PERMISSIONS";
const VIEW_PERMISSION_USAGE_ACTIVITY = "ViewPermissionUsageActivity";
const START_VIEW_PERMISSION_USAGE_PERMISSION = "android.permission.START_VIEW_PERMISSION_USAGE";
const HEALTH_CONNECT_IMPORT =
  "import dev.matinzd.healthconnect.permissions.HealthConnectPermissionDelegate";
const HEALTH_CONNECT_DELEGATE_CALL =
  "    HealthConnectPermissionDelegate.setPermissionDelegate(this)";

function ensureUsesPermission(androidManifest, permissionName) {
  const permissions = androidManifest.manifest["uses-permission"] ?? [];
  const alreadyExists = permissions.some(
    (permission) => permission.$?.["android:name"] === permissionName,
  );

  if (!alreadyExists) {
    permissions.push({
      $: {
        "android:name": permissionName,
      },
    });
  }

  androidManifest.manifest["uses-permission"] = permissions;
}

function ensureIntentFilter(activity, actionName, categoryName) {
  const intentFilters = activity["intent-filter"] ?? [];
  const alreadyExists = intentFilters.some((intentFilter) => {
    const hasAction = intentFilter.action?.some(
      (action) => action.$?.["android:name"] === actionName,
    );
    const hasCategory = categoryName
      ? intentFilter.category?.some((category) => category.$?.["android:name"] === categoryName)
      : true;

    return hasAction && hasCategory;
  });

  if (!alreadyExists) {
    const intentFilter = {
      action: [
        {
          $: {
            "android:name": actionName,
          },
        },
      ],
    };

    if (categoryName) {
      intentFilter.category = [
        {
          $: {
            "android:name": categoryName,
          },
        },
      ];
    }

    intentFilters.push(intentFilter);
  }

  activity["intent-filter"] = intentFilters;
}

function ensurePermissionUsageActivityAlias(androidManifest) {
  const application = AndroidConfig.Manifest.getMainApplicationOrThrow(androidManifest);
  const activityAliases = application["activity-alias"] ?? [];
  const alreadyExists = activityAliases.some(
    (activityAlias) => activityAlias.$?.["android:name"] === VIEW_PERMISSION_USAGE_ACTIVITY,
  );

  if (!alreadyExists) {
    activityAliases.push({
      $: {
        "android:name": VIEW_PERMISSION_USAGE_ACTIVITY,
        "android:exported": "true",
        "android:targetActivity": ".MainActivity",
        "android:permission": START_VIEW_PERMISSION_USAGE_PERMISSION,
      },
      "intent-filter": [
        {
          action: [
            {
              $: {
                "android:name": VIEW_PERMISSION_USAGE_ACTION,
              },
            },
          ],
          category: [
            {
              $: {
                "android:name": HEALTH_PERMISSIONS_CATEGORY,
              },
            },
          ],
        },
      ],
    });
  }

  application["activity-alias"] = activityAliases;
}

function addHealthConnectDelegateToMainActivity(contents) {
  let nextContents = contents;

  if (!nextContents.includes(HEALTH_CONNECT_IMPORT)) {
    nextContents = nextContents.replace(
      "import expo.modules.ReactActivityDelegateWrapper",
      `${HEALTH_CONNECT_IMPORT}\n\nimport expo.modules.ReactActivityDelegateWrapper`,
    );
  }

  if (!nextContents.includes(HEALTH_CONNECT_DELEGATE_CALL.trim())) {
    nextContents = nextContents.replace(
      /(\s+super\.onCreate\((?:null|savedInstanceState)\)\n)/,
      `$1${HEALTH_CONNECT_DELEGATE_CALL}\n`,
    );
  }

  return nextContents;
}

const withHealthConnectAndroid = (config) => {
  config = withAndroidManifest(config, (config) => {
    const androidManifest = config.modResults;
    const mainActivity = AndroidConfig.Manifest.getMainActivityOrThrow(androidManifest);

    ensureUsesPermission(androidManifest, READ_STEPS_PERMISSION);
    ensureIntentFilter(mainActivity, RATIONALE_ACTION);
    ensurePermissionUsageActivityAlias(androidManifest);

    return config;
  });

  config = withMainActivity(config, (config) => {
    if (config.modResults.language !== "kt") {
      return config;
    }

    config.modResults.contents = addHealthConnectDelegateToMainActivity(config.modResults.contents);

    return config;
  });

  return config;
};

module.exports = withHealthConnectAndroid;
