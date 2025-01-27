import './App.scss';
// import VideoPlayer from "./components/VideoPlayer.tsx"
import ReactPlayer from "react-player";
import { useState, useEffect, useRef } from 'react';

import path from 'path-browserify';

import fs from "vite-plugin-fs/browser";

const mediaPath: string = './media';

// const currentVideoIndex = 0;

async function createVideoArray(dirPath: string){
  const files = await fs.readdir(dirPath);
  const vidPaths: Array<string | null> = []; //video paths

  for (const file of files){
    const filePath = path.join(dirPath, file); //specific file path of file
    // const stat = ;
    // const stat = await fs.stat(filePath);
    const ext = path.extname(file).toLowerCase();
      if (ext === '.mp4' || ext === '.mov' || ext === '.avi' || ext === '.mkv' || ext === '.webm') {
        vidPaths.push(filePath);
    }
  }
  return vidPaths;
}

function randomizeArray(array: Array<string | null>){
  let index = array.length;

  // While loop to shuffle the array until the index is at zero
  while (index != 0) {
    // Generate a random index with Math.random(), and round it to the lowest int.
    const randomIndex = Math.floor(Math.random() * index);
    
    // Shuffle the positions
    [array[index], array[randomIndex]] = [
      array[randomIndex], array[index]];

    // Bring the index down by 1
    index--;
  }
}

const array: Array<string | null> = await createVideoArray(mediaPath);
randomizeArray(array);

const filteredArray = array.filter((item) => item !== undefined);
console.log(filteredArray);





function App() {


  const [videoIndex, setVideoIndex] = useState(1);
  const currentVideoRef = useRef(filteredArray[0]);
  useEffect(() => {
    currentVideoRef.current = filteredArray[videoIndex];
  }, [videoIndex]);

  // function initializeVideoRef(){
  //   setVideoIndex(() => (0));
  // }
  const handleNext = () => {
    setVideoIndex((prevIndex) => (prevIndex + 1) % filteredArray.length)
    console.log(videoIndex)
  };

  const handlePrevious = () => {
    setVideoIndex((prevIndex) => (prevIndex - 1 + filteredArray.length) % filteredArray.length);
    console.log(videoIndex)
  };
  // function initVideoIndex(){
  //   setVideoIndex((prevIndex) => (prevIndex + 1));
  //   console.log(videoIndex);
  // };
  // setVideoIndex(0);
  // initializeVideoRef();
  return (
    
    <div className="app-container">
      <h1>Engage</h1>
      <div className="video-player">
        <h2><div>
        <ReactPlayer 
                id = "video"
                url={currentVideoRef.current} 
                playing={true} 
                muted={true}
                controls={true}
                loop={true}
            />
          </div></h2>
      </div>
      <div className="controls">
        <button className="control-button" onClick={handlePrevious}>PREVIOUS</button>
        <button className="control-button" onClick={handleNext}>NEXT</button>
      </div>
      <div className="upload-section">
        <button className="upload-button" onClick={() => window.location.href = '/upload.html'}>UPLOAD</button>
      </div>
    </div>
  );
}

export default App;
