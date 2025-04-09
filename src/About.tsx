import "./styles/about.scss"
import "./components/DevInfo"
import DevInfo from "./components/DevInfo";
import { useEffect, useRef, useCallback } from "react";
import chillGuy from "./assets/chill-guy.mp3";

function About(){
    const audioRef = useRef<HTMLAudioElement | null>(null);
    useEffect(() => {
        const handleScroll = () => {
            if (audioRef.current) {
                const scrollY = window.scrollY;
                const maxVolume = 1; // Maximum volume
                const volume = Math.min(scrollY / 1000, maxVolume); // Adjust the divisor to control sensitivity
                audioRef.current.volume = volume;
            }
        };

        window.addEventListener("scroll", handleScroll);
        return () => {
            window.removeEventListener("scroll", handleScroll);
        };
    }, []);
    return(
        
            <div className="about__container">
                <section className="main__section">
                    <div className="logo">
                        <img src="/src/assets/icon.svg" alt="Engage Logo" />
                        <h1>Engage</h1>
                    </div>
                    <p>
                        Engage is a short video sharing platform optimized for both desktop and mobile, which is built from the ground up using technologies like React, Typescript, and Vite. Users can upload, comment, like, and much more to engage with our community. You can also fully download all videos on our platform.
                    </p>
                    <p>
                        Engage was created by the development team listed below as a senior capstone project (COSC 481W Winter 2025). Their drive to make a new original, unique, and <i>engaging</i> platform is represented in the expansive and interactive work you see on this website.
                    </p>
                    <h3>Sign up with Engage today!</h3>
                </section>
                <DevInfo
                    reverse={false}
                    name="Joshua Randall"
                    title="Team Lead, Head of Frontend, DevOps, and Deployment"
                    profileUrl="/src/assets/josh.jpg"
                    bio="Hi! I'm Josh, a 22 year old Computer Science - Curriculum Major. Switched from Electrical and Computer Engineering / Comp Engineering Technology in 2022, and will be graduating Fall 2025. Some of my hobbies relating to Computer Science include web development, programming, trying esoteric/difficult linux distributions + optimizing and customizing operating systems, and self-hosting applications/server administration. I currently work two jobs for EMU: I work as a Teacher's Assistant/Grader for two professors, and I work for EMU IT's Classroom Support."
                    website="https://joshrandall.net"
                />
                <DevInfo
                    reverse={true}
                    name="Johnny Zheng"
                    title="Co-Lead, Chief Officer, Head of Databases"
                    profileUrl="/src/assets/johnny.jpg"
                    bio="Hello, I am a computer science major in my senior year at Eastern Michigan University. I am a reserved person who values growth and improvement. Although I value my alone time, I do like interacting and collaborating with others. Even though I don't consider myself as a leader, I am not afraid to take command if that becomes necessary. Some of my standout traits are my persistence and my ability to learn quickly. Moreover, I am constantly working at developing my interests and becoming better at the things that I am good at whether that would be coding, art, cooking, or chess. It is not hard for me to lose myself for hours perfecting a skill."
                    website=""
                />
                <DevInfo
                    reverse={false}
                    name="Long (Jackson) Le"
                    title="Officer, Head of Backend"
                    profileUrl="/src/assets/long.JPG"
                    bio="Hi! I’m Long Nguyen Thanh Le, a passionate Computer Science student at Eastern Michigan University. With a sharp eye for design and a deep love for clean, scalable code, I bridges the gap between front-end finesse and back-end brains. Whether it's crafting responsive interfaces or optimizing database performance, I thrives on solving complex problems with elegant solutions. Fluent in Java, JavaScript, Python, TypeScript, React + Node.js, etc—and never afraid to dive into Rust, Scala, or whatever the project calls for—I believes the best code is invisible: it just works. With experience in both partime job as IT Help Desk Technician and academic rigor, I brings a balance of innovation and structure to every team. I'm always excited to learn, collaborate, and turn ideas into reality. Fun fact about me, I treat Leetcode the same as Workout. No pain no gain!!! Check out my website: "
                    website="https://longnguyenthanhle.github.io/"
                />
                <DevInfo
                    reverse={true}
                    name="Maksim Spitsyn"
                    title="Frontend Developer"
                    profileUrl="/src/assets/maksim.jpg"
                    bio="Computer Science major and Management minor. Taking 481 and a lot of other 400 level cs classes. Planning to create the greatest platform ever existed on the planet earth with my cool friend(teammates)."
                    website=""
                />
                <DevInfo
                    reverse={false}
                    name="Riyat Leiyate"
                    title="a chill guy"
                    profileUrl="https://upload.wikimedia.org/wikipedia/en/thumb/c/c7/Chill_guy_original_artwork.jpg/250px-Chill_guy_original_artwork.jpg"
                    bio="CompSci Major with Art Minor, Currently Senior, Part of EMU Esports LOL Team, Hate warm fruit."
                    website=""
                />
                <audio ref={audioRef} src={chillGuy} autoPlay={true} controls />
                
            </div>
        );
    }
export default About;