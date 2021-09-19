const shell = require("shelljs");
const prompt = require('prompt-sync')();

let package = null
let packageDependencies = null;
let rootFolder = null;
let rootFolderContents = [];
let nextProcess = null;

const log = (log) => {
    console.log("\x1B[31m" + log + "\x1B[0m");
}

const exit = () => {
    shell.exit(1);
}

const getRootFolder = () => {
    log("Root folder:");
    try {
        rootFolder = prompt();
        shell.cd(rootFolder);
        log("Current Location: ")
        shell.exec("pwd");
    } catch (e) {
        log(e);
        continueProcess(optionDirectory, optionExit);
    }
    process();
    continueProcess(optionPackage, optionDirectory, optionExit);
}

const choosePackage = () => {
    log("Package <name>@<version>: ");
    package = prompt();
    packageDependencies = shell.exec(`npm list ${package}`).stdout.split("\n");
    packageDependencies = packageDependencies.filter(content => content !== '');
    packageDependencies.shift(); // remove first element because it's the root package which is not needed for parsing.
    checkForUpgradableDependencies(packageDependencies);
}

const optionPackage = {name: "Choose Package", method: choosePackage};
const optionDirectory = {name: "Choose Directory", method: getRootFolder};
const optionExit = {name: "Exit", method: exit}

const continueProcess = (...options) => {
    log("Options: ");
    options.forEach((option, key) => {
        log(`${key} - ${option.name}`)
    })
    nextProcess = prompt();
    options[nextProcess].method();
    continueProcess(optionPackage, optionDirectory, optionExit);
}

const process = () => {
    rootFolderContents = shell.ls(rootFolder);
    const packageJson = rootFolderContents.find(element => element === "package.json");
    if (packageJson) {
        log("package.json found.");
        choosePackage();
    } else {
        log("This location has no package.json. Try another directory");
        continueProcess(optionDirectory, optionExit);
    }
}

const buildNode = (list) => {
    const nodeList = [];
    list.forEach(content => {
        const contentToProcess = content + " ";
        const startIndex = contentToProcess.match('[a-zA-Z]|@').index;
        const versionIndex = contentToProcess.indexOf('@', startIndex + 1) + 1;
        const spaceAfterVersionIndex = contentToProcess.indexOf(" ", versionIndex);
        const node = {
            index: startIndex,
            name: contentToProcess.substring(startIndex, versionIndex - 1),
            version: contentToProcess.substring(versionIndex, spaceAfterVersionIndex),
            textToPrint: content
        }
        nodeList.push(node);
    });
    return nodeList;
}

class Node {
    constructor(data) {
        this.data = data;
        this.child = [];
    }

    print() {
        console.log("\x1B[34m##############################################################################################\x1B[0m");
        console.log("\x1B[34m######################################## Result Below ########################################\x1B[0m");
        console.log("\x1B[34m##############################################################################################\x1B[0m");
        this.child.forEach(child => this.printChild(child));
        console.log("\x1B[34m##############################################################################################\x1B[0m");
        console.log("\x1B[34m######################################### Result End #########################################\x1B[0m");
        console.log("\x1B[34m##############################################################################################\x1B[0m");
    }

    printChild(child) {
        console.log(child.data.textToPrint);
        // shell.echo("-e", child.data.textToPrint);
        child.child.forEach(child => this.printChild(child));
    }

    updateUpgradablePackage() {
        this.child.forEach(kid => {
            this.find(kid);
        })
    }

    find(child) {
        try{
            if(child.child.length === 0){
                return;
            }
            child.child.forEach(kid => this.find(kid));
            const configs = shell.exec(`npm view ${child.data.name}@${child.data.version} dependencies`).stdout.split('\n');
            configs.forEach(config => {
                child.child.forEach(kid => {
                    if(config.includes("'"+kid.data.name+"'") || config.includes(kid.data.name+":")){
                        let minorUpgradable = false;
                        let patchUpgradable = false;
                        if(config.includes("^")){
                            minorUpgradable = true;
                        } else if (config.includes("~")){
                            patchUpgradable = true;
                        }
                        let newVersionLabel = kid.data.version;
                        if(minorUpgradable){
                            newVersionLabel = "^" + newVersionLabel;
                        } else if(patchUpgradable){
                            newVersionLabel = "~" + newVersionLabel;
                        }
                        kid.data.textToPrint = kid.data.textToPrint.replace(kid.data.version, newVersionLabel);
                        if(minorUpgradable || patchUpgradable){
                            kid.data.textToPrint = "\x1B[34m" + kid.data.textToPrint + "\x1B[0m";
                        }
                        // kid.data.textToPrint = kid.data.textToPrint;
                    }
                })
            })
        } catch (e) {
            log("Try something else");
            continueProcess(optionPackage, optionDirectory, optionExit);
        }
    }
};

const buildNodeTree = (nodeList) => {
    const parentNode = new Node();
    const nodeIndexes = {};
    nodeList.forEach((content, index) => {
        const node = new Node(content);
        if (nodeIndexes[content.index - 2]) {
            nodeIndexes[content.index - 2].child.push(node);
        } else if (nodeIndexes[content.index]){
            parentNode.child.push(nodeIndexes[content.index]);
        }
        nodeIndexes[content.index] = node;
        if(index === nodeList.length - 1){
            parentNode.child.push(nodeIndexes[4]);
        }
    })
    return parentNode;
};

const checkForUpgradableDependencies = (packageDependencies) => {
    const nodeList = buildNode(packageDependencies);
    const nodeTree = buildNodeTree(nodeList);
    // nodeTree.print();
    nodeTree.updateUpgradablePackage();
    nodeTree.print();
}

// C:\My Projects\materialui-practice\material-ui-react-practice
// sass-loader
// 10.2.0
// workbox-core
// 5.1.4
getRootFolder();
// shell.echo('-e',"\x1B[32m foobar \x1B[0m");
