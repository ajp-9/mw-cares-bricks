async function showModal(id) {
  await new Promise(r => setTimeout(r, 8));
  document.getElementById("modal").style.display = "block"
  document.getElementById("modal").innerHTML = id.getElementsByClassName("sponsor")[0].innerHTML + id.getElementsByClassName("dedication")[0].innerHTML
  console.log(id)
}

document.addEventListener("click", function() {
  document.getElementById("modal").style.display = "none"
})
