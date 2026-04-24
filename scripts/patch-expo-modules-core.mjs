import fs from 'node:fs';
import path from 'node:path';

const rootDir = process.cwd();

const files = [
  {
    path: path.join(rootDir, 'node_modules', 'expo-modules-core', 'android', 'build.gradle'),
    from: `  afterEvaluate {
    println("Linking react-native-worklets native libs into expo-modules-core build tasks")
    println(workletsProject.tasks.getByName("mergeDebugNativeLibs"))
    println(workletsProject.tasks.getByName("mergeReleaseNativeLibs"))
    tasks.getByName("buildCMakeDebug").dependsOn(workletsProject.tasks.getByName("mergeDebugNativeLibs"))
    tasks.getByName("buildCMakeRelWithDebInfo").dependsOn(workletsProject.tasks.getByName("mergeReleaseNativeLibs"))
  }`,
    to: `  afterEvaluate {
    println("Linking react-native-worklets native libs into expo-modules-core build tasks")
    def mergeDebugNativeLibs = workletsProject.tasks.findByName("mergeDebugNativeLibs")
    def mergeReleaseNativeLibs = workletsProject.tasks.findByName("mergeReleaseNativeLibs")
    def buildCMakeDebug = tasks.findByName("buildCMakeDebug")
    def buildCMakeRelWithDebInfo = tasks.findByName("buildCMakeRelWithDebInfo")

    if (mergeDebugNativeLibs != null && buildCMakeDebug != null) {
      buildCMakeDebug.dependsOn(mergeDebugNativeLibs)
    } else {
      println("Skipping worklets debug native libs dependency wiring.")
    }

    if (mergeReleaseNativeLibs != null && buildCMakeRelWithDebInfo != null) {
      buildCMakeRelWithDebInfo.dependsOn(mergeReleaseNativeLibs)
    } else {
      println("Skipping worklets release native libs dependency wiring.")
    }
  }`,
  },
  {
    path: path.join(rootDir, 'node_modules', 'expo-modules-core', 'android', 'ExpoModulesCorePlugin.gradle'),
    from: `  project.afterEvaluate {
    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`,
    to: `  project.afterEvaluate {
    if (components.findByName("release") == null) {
      return
    }

    publishing {
      publications {
        release(MavenPublication) {
          from components.release
        }
      }
      repositories {
        maven {
          url = mavenLocal().url
        }
      }
    }
  }`,
  },
];

let patchedCount = 0;

for (const file of files) {
  if (!fs.existsSync(file.path)) {
    console.warn(`[patch-expo-modules-core] Skipping missing file: ${path.relative(rootDir, file.path)}`);
    continue;
  }

  const current = fs.readFileSync(file.path, 'utf8');
  if (current.includes(file.to)) {
    continue;
  }

  if (!current.includes(file.from)) {
    throw new Error(`[patch-expo-modules-core] Could not find expected snippet in ${path.relative(rootDir, file.path)}. The upstream package likely changed and this patch should be reviewed.`);
  }

  fs.writeFileSync(file.path, current.replace(file.from, file.to), 'utf8');
  patchedCount += 1;
}

if (patchedCount > 0) {
  console.log(`[patch-expo-modules-core] Applied ${patchedCount} patch${patchedCount === 1 ? '' : 'es'}.`);
} else {
  console.log('[patch-expo-modules-core] Already patched.');
}
