var popup = null;
var base_url;
if (typeof document.dev_env != "undefined") {
  base_url = document.dev_env;
}
else {
  //get resources off of github to not inflate the jsdelivr stats
  base_url = "https://raw.githubusercontent.com/ading2210/edpuzzle-answers/main";
}

function http_get(url, callback, headers=[], method="GET", content=null) {
  var request = new XMLHttpRequest();
  request.addEventListener("load", callback);
  request.open(method, url, true);

  if (window.__EDPUZZLE_DATA__ && window.__EDPUZZLE_DATA__.token) {
    headers.push(["authorization", window.__EDPUZZLE_DATA__.token]);
  }
  for (const header of headers) {
    request.setRequestHeader(header[0], header[1]);
  }
  
  request.send(content);
}

function init() {
  if (window.location.hostname == "edpuzzle.hs.vc") {
    alert("To use this, drag this button into your bookmarks bar. Then, run it when you're on an Edpuzzle assignment.");
  }
  else if ((/https?:\/\/edpuzzle\.com\/media\/[a-f0-9]{1,30}(\/|$)/).test(window.location.href)) {
    getAnswers();
  }
  else if (window.canvasReadyState) {
    handleCanvasURL();
  }
  else if (window.schoologyMoreLess) {
    handleSchoologyURL();
  }
  else {
    alert("Please run this script on an Edpuzzle assignment. For reference, the URL should look like this:\nhttps://edpuzzle.com/assignments/{ASSIGNMENT_ID}/watch");
  }
}

function handleCanvasURL() {
  let location_split = window.location.href.split("/");
  let url = `/api/v1/courses/${location_split[4]}/assignments/${location_split[6]}`;
  http_get(url, function(){
    let data = JSON.parse(this.responseText);
    let url2 = data.url;

    http_get(url2, function() {
      let data = JSON.parse(this.responseText);
      let url3 = data.url;

      alert(`Please re-run this script in the newly opened tab. If nothing happens, then allow popups on Canvas and try again.`);
      open(url3);
    });
  });
}

function handleSchoologyURL() {
  let assignment_id = window.location.href.split("/")[4];
  let url = `/external_tool/${assignment_id}/launch/iframe`;
  http_get(url, function() {
    alert(`Please re-run this script in the newly opened tab. If nothing happens, then allow popups on Schoology and try again.`);

    //strip js tags from response and add to dom
    let html = this.responseText.replace(/<script[\s\S]+?<\/script>/, ""); 
    let div = document.createElement("div");
    div.innerHTML = html;
    let form = div.querySelector("form");
    
    let input = document.createElement("input")
    input.setAttribute("type", "hidden");
    input.setAttribute("name", "ext_submit");
    input.setAttribute("value", "Submit");
    form.append(input);
    document.body.append(div);

    //submit form in new tab
    form.setAttribute("target", "_blank");
    form.submit();
    div.remove();
  });
}

function getAnswers() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';
  input.onchange = async (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const answers = JSON.parse(e.target.result);
        openPopup(answers);
      } catch (error) {
        alert(`Error parsing JSON: ${error}`);
      }
    };
    reader.readAsText(file);
  };
  input.click();
}

function openPopup(answers) { // Changed parameter to answers
  // Create minimal media info for UI
  const media = {
    title: "Edpuzzle Assignment",
    user: { name: "Teacher" },
    createdAt: new Date().toISOString(),
    thumbnailURL: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII="
  };

  const base_html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * {font-family: 'Poppins', Arial, sans-serif;}
  </style>
  <script>
    // ====== PASS ANSWERS TO POPUP ======
    window.localAnswers = ${JSON.stringify(answers)};
    
    var base_url = "${base_url}";
    function http_get(url, callback) {
      var request = new XMLHttpRequest();
      request.addEventListener("load", callback);
      request.open("GET", url, true);
      request.send();
    }
    function get_tag(tag, url) {
      console.log("Loading "+url);
      http_get(url, function(){
        if ((""+this.status)[0] == "2") {
          var element = document.createElement(tag);
          element.innerHTML = this.responseText;
          document.getElementsByTagName("head")[0].appendChild(element);
        }
        else {
          console.error("Could not fetch "+url);
        }
      });
    }
    
    // Load scripts AFTER answers are available
    window.addEventListener('DOMContentLoaded', () => {
      get_tag("style", base_url+"/app/popup.css");
      get_tag("script", base_url+"/app/popup.js");
      get_tag("script", base_url+"/app/videooptions.js");
      get_tag("script", base_url+"/app/videospeed.js");
    });
  </script>
  <title>Edpuzzle Answers</title>
</head>
<body>
  <div class="container">
    <header>
      <div class="header-content">
        <img src="${media.thumbnailURL}" alt="Video Thumbnail" class="thumbnail">
        <div class="video-info">
          <h1>${media.title}</h1>
          <p>Loaded ${answers.length} answers</p>
        </div>
      </div>
      <div class="controls">
        <button id="skipper" onclick="skip_video();" disabled>Skip Video</button>
        <button id="answers_button" onclick="answer_questions();" disabled>Submit Answers</button>
        <!-- Keep existing speed controls -->
        ${document.querySelector('.speed-control').outerHTML}
        ${document.querySelector('.pause-control').outerHTML}
      </div>
    </header>
    <main>
      <p class="info">Answers loaded successfully</p>
      <div id="content" class="questions">
        <p id="loading_text">Ready to submit ${answers.length} answers</p>
      </div>
    </main>
    <footer>
      <!-- Keep original footer intact -->
      ${document.querySelector('footer').innerHTML}
    </footer>
  </div>
</body>
</html>`;

  popup = window.open("about:blank", "", "width=600, height=400");
  popup.document.write(base_html);
  popup.document.close();

  // Pass essential data to popup
  popup.document.edpuzzle_data = window.__EDPUZZLE_DATA__;
  popup.window.onload = () => {
    // Initialize with answers instead of API data
    const content = popup.document.getElementById("content");
    content.innerHTML = answers.map(a => 
      `<div class="answer">
        <p>Question ID: ${a.id.slice(-6)}</p>
        <p>Answers: ${a.answers.join(", ")}</p>
      </div>`
    ).join("");
  };
}

function getMedia(assignment, answers) {
  var text = popup.document.getElementById("loading_text");
  var content = popup.document.getElementById("content");

  text.innerHTML = `Fetching assignments...`;
  
  var media_id = assignment.teacherAssignments[0].contentId;
  var url2 = `https://edpuzzle.com/api/v3/media/${media_id}`;

  function handle_error(msg) {
    text.remove();
    content.innerHTML += `<p style="font-size: 12px">${msg}</p>`;
    popup.document.getElementById("skipper").disabled = false;
  }

  parseQuestions(answers, media_id);
}

function parseQuestions(questions, media_id) {
  var text = popup.document.getElementById("loading_text");
  var content = popup.document.getElementById("content");
  popup.document.questions = questions;
  text.remove();

  if (questions == null) {
    content.innerHTML += `<p style="font-size: 12px">Error: Could not get the media for this assignment. </p>`;
    return;
  }
  
  var question;
  var counter = 0;
  var counter2 = 0;
  for (let i=0; i<questions.length; i++) {
    for (let j=0; j<questions.length-i-1; j++) {
      if (questions[j].time > questions[j+1].time){
       let question_old = questions[j];
       questions[j] = questions[j + 1];
       questions[j+1] = question_old;
     }
    }
  }
  
  for (let i=0; i<questions.length; i++) {
    question = questions[i];
    let choices_lines = [];
    
    if (typeof question.choices != "undefined") {
      let min = Math.floor(question.time/60).toString();
      let secs = Math.floor(question.time%60).toString();
      if (secs.length == 1) {
        secs = "0"+secs;
      }
      let timestamp = min+":"+secs;
      let question_content;
      if (question.body[0].text != "") {
        question_content = `<p>${question.body[0].text}</p>`;
      }
      else {
        question_content = question.body[0].html;
      }

      let answer_exists = false;
      for (let j=0; j<question.choices.length; j++) {
        let choice = question.choices[j];
        if (typeof choice.body != "undefined") {
          counter++;
          let item_html;
          if (choice.body[0].text != "") {
            item_html = `<p>${choice.body[0].text}</p>`;
          }
          else {
            item_html = `${choice.body[0].html}`;
          }
          if (choice.isCorrect == true) {
            choices_lines.push(`<li class="choice choice-correct">${item_html}</li>`);
            answer_exists = true;
          }
          else {
            choices_lines.push(`<li class="choice">${item_html}</li>`);
          }
        }
      }
      if (!answer_exists) continue;
      
      let choices_html = choices_lines.join("\n");
      let table = ``
      if (counter2 != 0) {
        table += `<hr>`;
      }
      table += `
      <table>
        <tr class="header no_vertical_margin">
          <td class="timestamp_div no_vertical_margin">
            <p>[${timestamp}]</p>
          </td>
          <td class="question">
            ${question_content}
          </td>
        </tr>
        <tr>
          <td></td>
          <td>
            <ul style="margin-top: 6px; margin-bottom: 0px; padding-left: 18px;">
              ${choices_html}
            </ul>
          </td>
        </tr>
      </table>
      `;
      
      content.innerHTML += table;
      counter2++;
    }
  }
  popup.document.getElementById("skipper").disabled = false;
  if (counter == 0 || counter2 == 0) {
    var url2 = `https://edpuzzle.com/media/${media_id}`;
    content.innerHTML += `
      <p style="font-size: 12px">No valid multiple choice questions were found.</p>
      <p>Note: As of April 2nd, Edpuzzle has patched the previous method that this script use. While we work on a more permanent fix, follow the steps listed below.</p>
      <p style="font-size: 12px"><b>Temporary workaround:</b></p>
      <ol style="font-size: 12px; padding-left: 12px;">
        <li>Open edpuzzle.com in a different browser, or new incognito window.</li>
        <li>Sign up for a teacher account. You only need an email address for this.</li>
        <li>Open the following link with your teacher account: <a href="${url2}" target="_blank">${url2}</a></li>
      </ol>
    `;
  }
  else {
    popup.document.getElementById("answers_button").disabled = false;
  }
  popup.questions = questions;
}

init();
