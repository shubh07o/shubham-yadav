function showMessage() {
  const message = document.getElementById('message');
  message.textContent = "You're doing amazing, Shubham! Keep coding. 🔥💻";
}
const totalImages = 21;
let currentImage = 1;
const img = document.getElementById("slideshow");

setInterval(() => {
  currentImage = (currentImage % totalImages) + 1;
  img.src = `assets/images/${currentImage}.jpg.jpg`;
}, 3000); // changes every 3 seconds
