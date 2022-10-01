const fs = require("fs");
const crypto = require('crypto');
const axios = require('axios').default;
const { spawn } = require("child_process");

let baseUrl = "https://papermc.io/api/v2/projects/paper"
let jarName = "server.jar"

let version;
let build;
let jar;

(async () => { while (true) await mainLoop() })()

async function mainLoop() {
    console.clear()
    console.log("Starting server in 3 seconds...\n")
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log("Checking for updates...")

    let versionData = (await axios.get(baseUrl)).data.versions
    version = versionData[versionData.length-1]

    let buildData = (await axios.get(baseUrl+"/versions/"+version)).data.builds
    build = buildData[buildData.length-1]

    let jarData = (await axios.get(baseUrl+"/versions/"+version+"/builds/"+build)).data.downloads
    jar = jarData.application.name

    if (jarData.application.sha256 !== getServerJarHash()) {
        console.log("New build detected, starting update.")
        await updateServerJar(baseUrl+"/versions/"+version+"/builds/"+build+"/downloads/"+jar);
        console.log("Finished updating, starting server.")
    }
    else console.log("Everything's up to date, starting server.")

    console.log()

    await new Promise((resolve) => {
        spawn("java", ["-jar", jarName, "--nogui"], { stdio: 'inherit' }).on('exit', function() {
            resolve()
        })
    })
}

async function updateServerJar(downloadUrl) {
    let downloadStream = await axios({
        method: "get",
        url: downloadUrl,
        responseType: "stream"
    })

    downloadStream.data.pipe(fs.createWriteStream(jarName));

    await new Promise((resolve, reject) => {
        downloadStream.data.on('end', resolve)
        downloadStream.data.on('error', reject);
    })
}

function getServerJarHash() {
    if (!fs.existsSync(jarName)) return null
    let hashSum = crypto.createHash('sha256');
    hashSum.update(fs.readFileSync(jarName));
    return hashSum.digest('hex');
}