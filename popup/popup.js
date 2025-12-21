document.addEventListener("DOMContentLoaded", () => {

  const button = document.getElementById("mybutton");

  const resultText = document.getElementById("result");


  button.addEventListener("click", () => {



    resultText.textContent = "Working...";


    chrome.runtime.sendMessage(

      { action: "DECLUTTER_NOW" },

      (response) => {

        if (chrome.runtime.lastError) {

          resultText.textContent = "Something went wrong.";

          return;

        }



        if (response && response.closedCount !== undefined) {

          if (response.closedCount === 0) {

            resultText.textContent = "No unnecessary tabs found.";

          } else {

            resultText.textContent = `Closed ${response.closedCount} tab(s).`;

          }
        }
      }
    );
  });
});
