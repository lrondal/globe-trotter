# Installing Globe trotter on a phone, for free

There is no App Store or Play Store build. The **Release builds** workflow (`.github/workflows/release.yml`) makes the two install files:

| File | Phone | Signed by |
|---|---|---|
| `GlobeTrotter.ipa` | iPhone | nobody: SideStore signs it on the phone with your free Apple ID |
| `GlobeTrotter.apk` | Android | Expo's shared debug key, so each new build installs over the last one |

## Making a release

```sh
git tag v1.0.0 <commit>     # the commit you call v1.0.0, usually the tip of master
git push origin v1.0.0
```

The iOS and Android builds take about 15 to 30 minutes on GitHub's machines (free, since the repo is public). The two files are then attached to the release at `https://github.com/lrondal/globe-trotter/releases`.

To get the files without a release, open **Actions → Release builds → Run workflow**. They appear as artifacts on the run.

## iPhone, with SideStore

A free Apple ID signs apps for **7 days** only. SideStore re-signs them **from the phone itself**, over Wi-Fi or mobile data, so after the first setup you don't need the PC any more.

Limits of a free Apple ID: at most **3 sideloaded apps** at a time, and SideStore counts as one of them.

SideStore's setup changes from time to time, so follow its official guide: <https://docs.sidestore.io>. In short:

1. **Once, from the PC:** install SideStore with the installer the guide recommends (it runs on Windows). It needs the iPhone plugged in by USB, and Apple's iTunes and iCloud for Windows from apple.com, not the Microsoft Store versions. It also creates the *pairing file* SideStore needs.
2. On the iPhone, trust your Apple ID in **Settings → General → VPN & Device Management**. Turn on **Settings → Privacy & Security → Developer Mode**, which restarts the phone.
3. Install **LocalDevVPN** from the App Store. SideStore uses it to sign apps on the phone. (The guide names the app to use if it has changed.)
4. Download `GlobeTrotter.ipa` from the release in Safari. In SideStore, open **My Apps → +** and pick the file.
5. **Automatic refresh:** in SideStore's settings, turn on background refresh. You can also add a daily automation in the Shortcuts app with SideStore's *Refresh all apps* action. Check the **My Apps** tab now and then for how many days are left.

**Your data is safe.** An expired app no longer opens, but its data stays on the phone. A refresh brings it back as it was. To update, install the new `.ipa` the same way: it replaces the app and keeps its data, because the bundle identifier `com.lrondal.globetrotter` doesn't change.

## Android

Download `GlobeTrotter.apk` on the phone, open it, and allow installs from that source when Android asks. It doesn't expire. A newer `.apk` installs over the old one and keeps the data.
