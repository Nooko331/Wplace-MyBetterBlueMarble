// ==UserScript==
// @name            Blue Marble
// @name:en         Blue Marble
// @namespace       https://github.com/SwingTheVine/
// @version         0.92.0
// @description     A userscript to enhance the user experience on Wplace.live. This includes, but is not limited to: uploading images to display locally on a canvas, adding a button to move the Wplace color palette menu, and other QoL features.
// @description:en  A userscript to enhance the user experience on Wplace.live. This includes, but is not limited to: uploading images to display locally on a canvas, adding a button to move the Wplace color palette menu, and other QoL features.
// @author          SwingTheVine
// @license         MPL-2.0
// @supportURL      https://discord.gg/tpeBPy46hf
// @homepageURL     https://bluemarble.lol/
// @icon            https://raw.githubusercontent.com/SwingTheVine/Wplace-BlueMarble/52b13267ad6c96462430103593a0806195302d67/dist/assets/Favicon.png
// @match           https://wplace.live/*
// @grant           GM_getResourceText
// @grant           GM_addStyle
// @grant           GM.setValue
// @grant           GM_getValue
// @grant           GM_deleteValue
// @grant           GM_xmlhttpRequest
// @grant           GM.download
// @connect         telemetry.thebluecorner.net
// @resource        CSS-BM-File https://raw.githubusercontent.com/SwingTheVine/Wplace-BlueMarble/52b13267ad6c96462430103593a0806195302d67/dist/BlueMarble.user.css
// @antifeature     tracking Anonymous opt-in telemetry data
// @noframes
// ==/UserScript==

// Wplace  --> https://wplace.live
// License --> https://www.mozilla.org/en-US/MPL/2.0/
// Donate  --> https://ko-fi.com/swingthevine

/*!
  This script is not affiliated with Wplace.live in any way, use at your own risk.
  This script is not affiliated with any userscript manager.
  The author of this userscript is not responsible for any damages, issues, loss of data, or punishment that may occur as a result of using this script.
  This script is provided "as is" under the MPL-2.0 license.
  The "Blue Marble" icon is licensed under CC0 1.0 Universal (CC0 1.0) Public Domain Dedication.
  The "Blue Marble" image is owned by NASA.
*/

