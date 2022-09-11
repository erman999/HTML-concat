// Missing option: preserveIndent option can be added to HTML as an property
// Missing option: Multiple file tag can be work together (e.g "<file>...</file><file>...</file>")
// Missing option: Searching file prefix can be user selected (e.g "x-index" instead of "t-index")

const fs = require('fs');
const path = require('path');

// recursiveScan: Run a recursive scan in given path, push found filenames in an array, return the array
let recursiveScan = function(dir) {
  let foundPaths = new Array();
  let excludeFolders = ['node_modules'];
  let ls = fs.readdirSync(dir, {encoding: 'utf8'});
  ls.forEach((item, i) => {
    let fullPath = path.join(dir, item);
    if (!excludeFolders.includes(item)) {
      if ( fs.statSync(fullPath).isDirectory()) {
        foundPaths = foundPaths.concat(recursiveScan(fullPath));
      } else {
        foundPaths.push(fullPath);
      }
    }
  });
  return foundPaths;
}

// findfiles: Find files in scanned dir where filenames starts with "t-" and ends with ".html", push matched files to an array as object, return the array
let findfiles = function(scannedDir) {
  let foundFiles = new Array();
  scannedDir.forEach((item, i) => {
    let basename = path.basename(item);
    let dirname = path.dirname(item);
    let isMatch = new RegExp('^t\-.+\.html$', 'g').test(basename);
    if (isMatch) {
      let file = basename.split('t-')[1];
      foundFiles.push({path: item, templateFile: basename, file: file, dirname: dirname});
    }
  });
  return foundFiles;
}

// Read template file, find <file> tags, merge file with "url" property address file, write file
let mergeFiles = function(obj) {
  const preserveIndent = true;
  const regexFile = /<file.*><\/file>/g;
  const regexUrl = /<file url="(.*?)"><\/file>/;
  const regexSpace = /\s.*?(?=<file)/g;

  let templateFile =  fs.readFileSync(obj.path, {encoding: 'utf8'});
  let lines = templateFile.split('\n');
  let missingContents = [];

  lines.forEach((item, i) => {
    let result = item.match(regexFile);
    if (result !== null) {
      let filename = item.match(regexUrl)[1];
      let isFileExist = fs.existsSync(filename);
      if (!isFileExist) {
        missingContents.push({file: obj.file, build: "failed", missingFile: filename});
        return false;
      }
      let content = fs.readFileSync(filename, {encoding: 'utf8'});
      if (preserveIndent) {
        let space = item.match(regexSpace);
        if (space == null) {space = '';}
        let contentLines = content.split("\n");
        contentLines.forEach((item, n) => {
          contentLines[n] = space + item + "\n";
        });
        content = contentLines.join('');
      }
      lines[i] = item.replace(regexFile, content.trim());
    }
  });

  if (missingContents.length == 0) {
    let writeStream = fs.createWriteStream(path.join(obj.dirname, obj.file), {encoding: 'utf8'});
    lines.forEach((item, i) => {
      writeStream.write(item + "\n", 'utf8');
    });
    writeStream.end();

    writeStream.on('finish', () => { console.log("HTML-concat", {file: obj.file, build: "successful"}); });
    writeStream.on('error', (err) => { console.log("HTML-concat", err.stack); });
  } else {
    missingContents.forEach((item, i) => {
      console.error("HTML-concat", item);
    });
  }
}

let scannedDir = recursiveScan(__dirname);
let foundFiles = findfiles(scannedDir);

foundFiles.forEach((item, i) => {
  let lines = mergeFiles(item);
});
