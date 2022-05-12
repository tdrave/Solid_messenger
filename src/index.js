import {
  getSolidDataset,
  getThing,
  setThing,
  getStringNoLocale,
  setStringNoLocale,
  saveSolidDatasetAt,
  getUrlAll,
  getFile, isRawData, getContentType, getSourceUrl,
  getDate
} from "@inrupt/solid-client";
//import { writeFile } from 'fs/promises';
import { Session } from "@inrupt/solid-client-authn-browser";
import { FOAF, VCARD } from "@inrupt/vocab-common-rdf";

// If your Pod is *not* on `solidcommunity.net`, change this to your identity provider.
const SOLID_IDENTITY_PROVIDER = "https://solidcommunity.net";
document.getElementById(
  "solid_identity_provider"
).innerHTML = `[<a target="_blank" href="${SOLID_IDENTITY_PROVIDER}">${SOLID_IDENTITY_PROVIDER}</a>]`;

const NOT_ENTERED_WEBID =
  "...not logged in yet - but enter any WebID to read from its profile...";

const session = new Session();

const buttonLogin = document.getElementById("btnLogin");
const writeForm = document.getElementById("writeForm");
const readForm = document.getElementById("readForm");
const addFriendform = document.getElementById("addFriend");

// 1a. Start Login Process. Call session.login() function.
async function login() {
  if (!session.info.isLoggedIn) {
    await session.login({
      oidcIssuer: SOLID_IDENTITY_PROVIDER,
      clientName: "Inrupt tutorial client app",
      redirectUrl: window.location.href
    });
  }
}

// 1b. Login Redirect. Call session.handleIncomingRedirect() function.
// When redirected after login, finish the process by retrieving session information.
async function handleRedirectAfterLogin() {
  await session.handleIncomingRedirect(window.location.href);
  if (session.info.isLoggedIn) {
    // Update the page with the status.
    document.getElementById(
      "labelStatus"
    ).innerHTML = `Your session is logged in with the WebID [<a target="_blank" href="${session.info.webId}">${session.info.webId}</a>].`;
    document.getElementById("labelStatus").setAttribute("role", "alert");
    document.getElementById("webID").value = session.info.webId;
  }
}

// The example has the login redirect back to the index.html.
// This calls the function to process login information.
// If the function is called when not part of the login redirect, the function is a no-op.
handleRedirectAfterLogin();

// 2. Write to profile
async function writeProfile() {

  if (!session.info.isLoggedIn) {
    // You must be authenticated to write.
    document.getElementById(
      "labelWriteStatus"
    ).textContent = `login first!`;
    document.getElementById("labelWriteStatus").setAttribute("role", "alert");
    return;
  }
  const webID = session.info.webId;
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, {
    fetch: session.fetch
  });

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(myProfileDataset, webID);

  // Using the name provided in text field, update the name in your profile.
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.


  profile = setStringNoLocale(profile, VCARD.fn, document.getElementById("userName").value);
  profile = setStringNoLocale(profile, FOAF.name, document.getElementById("fullName").value);


  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);

  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch
  });

  readProfile()

}

// 3. Read profile
async function readProfile() {
  const webID = document.getElementById("webID").value;

  if (webID === NOT_ENTERED_WEBID) {
    document.getElementById(
      "labelFN"
    ).textContent = `Login first, or enter a WebID (any WebID!) to read from its profile`;
    return false;
  }

  try {
    new URL(webID);
  } catch (_) {
    document.getElementById(
      "labelFN"
    ).textContent = `Provided WebID [${webID}] is not a valid URL - please try again`;
    return false;
  }

  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // Profile is public data; i.e., you do not need to be logged in to read the data.
  // For illustrative purposes, shows both an authenticated and non-authenticated reads.

  let myDataset;
  try {
    if (session.info.isLoggedIn) {
      myDataset = await getSolidDataset(profileDocumentUrl.href, { fetch: session.fetch });

      readFileFromPod(`https://tdrave.solidcommunity.net/profile/Image_1652173540900.png`);

    } else {
      myDataset = await getSolidDataset(profileDocumentUrl.href);
      console.log("not")
    }
  } catch (error) {
    document.getElementById(
      "labelFN"
    ).textContent = `Entered value [${webID}] does not appear to be a WebID. Error: [${error}]`;
    return false;
  }

  const profile = getThing(myDataset, webID);

  // Get the formatted name (fn) using the property identifier "http://www.w3.org/2006/vcard/ns#fn".
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.

  const formattedName = getStringNoLocale(profile, VCARD.fn);
  const name = getStringNoLocale(profile, FOAF.name);
  const role = getStringNoLocale(profile, VCARD.role)
  const bday = getDate(profile, VCARD.bday)
  const acquaintances = getUrlAll(profile, FOAF.knows);
  

  //console.log(name)

  // Update the page with the retrieved values.
  //document.getElementById("labelFN").textContent = `[${formattedName}]`;
  document.getElementById("labelFN").textContent = `[${formattedName}]`;
  document.getElementById("name").textContent = `[${name}]`;
  document.getElementById("role").textContent = `[${role}]`;
  document.getElementById("bday").textContent = `[${bday}]`;
  document.getElementById("friends").textContent = `[${acquaintances}]`;
}

async function readFileFromPod(fileURL) {
  try {
    // file is a Blob (see https://developer.mozilla.org/docs/Web/API/Blob)
    const file = await getFile(
      fileURL,               // File in Pod to Read
      { fetch: fetch }       // fetch from authenticated session
    );

    console.log( `Fetched a ${getContentType(file)} file from ${getSourceUrl(file)}.`);
    console.log(`The file is ${isRawData(file) ? "not " : ""}a dataset.`);

  } catch (err) {
    console.log(err);
  }
}

async function addFriend() {
  console.log(document.getElementById("friendURL").value)

  if (!session.info.isLoggedIn) {
    // You must be authenticated to write.
    document.getElementById(
      "logInCheck"
    ).textContent = `login first!`;
    return;
  }
  const webID = session.info.webId;
  // The WebID can contain a hash fragment (e.g. `#me`) to refer to profile data
  // in the profile dataset. If we strip the hash, we get the URL of the full
  // dataset.
  const profileDocumentUrl = new URL(webID);
  profileDocumentUrl.hash = "";

  // To write to a profile, you must be authenticated. That is the role of the fetch
  // parameter in the following call.
  let myProfileDataset = await getSolidDataset(profileDocumentUrl.href, {
    fetch: session.fetch
  });

  // The profile data is a "Thing" in the profile dataset.
  let profile = getThing(myProfileDataset, webID);

  // Using the name provided in text field, update the name in your profile.
  // VCARD.fn object is a convenience object that includes the identifier string "http://www.w3.org/2006/vcard/ns#fn".
  // As an alternative, you can pass in the "http://www.w3.org/2006/vcard/ns#fn" string instead of VCARD.fn.


  profile = setStringNoLocale(profile, VCARD.fn, document.getElementById("userName").value);
  profile = setStringNoLocale(profile, FOAF.name, document.getElementById("fullName").value);


  // Write back the profile to the dataset.
  myProfileDataset = setThing(myProfileDataset, profile);

  // Write back the dataset to your Pod.
  await saveSolidDatasetAt(profileDocumentUrl.href, myProfileDataset, {
    fetch: session.fetch
  });
}

buttonLogin.onclick = function () {
  login();
};

writeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  writeProfile();
});

addFriendForm.addEventListener("submit", (event) => {
  event.preventDefault();
  addFriend();
});

readForm.addEventListener("submit", (event) => {
  event.preventDefault();
  readProfile();
});
