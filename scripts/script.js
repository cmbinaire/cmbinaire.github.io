// Casse-toi en fait.

// Ready

$(document).ready(function () {
    chooseRandomStylesheet();
    updateTitleStyle();
    $("#trialForm").on("submit", function (event) {
        event.preventDefault();
        submitFormData(collectFormData());
    });
    $("#trialTable").ready(function () {
        fetchTrials();
    });
});



// Style

function chooseRandomStylesheet() {
    const stylesheets = [
        "/stylesheets/style-cute.css",
        "/stylesheets/style-cyberpunk.css",
        "/stylesheets/style-funky.css",
        "/stylesheets/style-minimal.css",
        "/stylesheets/style-neon.css",
        "/stylesheets/style-vintage.css"
    ];
    const randomStylesheet = stylesheets[Math.floor(Math.random() * stylesheets.length)];
    $("#dynamic-stylesheet").attr("href", randomStylesheet);
}

function updateTitleStyle() {
    const $title = $("h2");
    setInterval(() => {
        $title.css({
            color: `hsl(${Math.random() * 360}, 100%, 70%)`,
            transform: `rotate(${Math.random() * 10 - 5}deg)`
        });
    }, 500);
}



// Sue

function collectFormData() {
    return {
        action:         "add",
        defense:        $("#defense").val(),
        prosecution:    $("#prosecution").val(),
        judge:          $("#judge").val(),
        jury:           $("#jury").is(":checked"),
        details:        $("#details").val()
    };
}

function submitFormData(formData) {
    fetch("https://script.google.com/macros/s/AKfycbw5vuvx1ZBE42KdiH2agfo0uv4cc4KdBICz5E0-wvbVa1D6nHWQdO5EO5tG76D6mV7M/exec", { 
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
    })
    .then(handleSubmitSuccess)
    .catch(handleSubmitError);
}

function handleSubmitError() {
    $("#trialForm").hide();
    $("#error").show();
}

function handleSubmitSuccess() {
    $("#trialForm").hide();
    $("#confirmation").show();
}



// Get Trials

function fetchTrials() {
    const query = "SELECT G, B, C, D, E, F";
    const url = `https://docs.google.com/spreadsheets/d/1dFnNy_fPp-xiR3kVabNzKukSjG9p8eIF2c-qUupwCnM/gviz/tq?tq=${encodeURIComponent(query)}&tqx=out:json`;
    fetch(url)
        .then(response => response.text())
        .then(handleFetchSuccess)
        .then(checkAndMarkVotes);
}

async function handleFetchSuccess(data) {
    const json = JSON.parse(data.match(/\{.*\}/s)[0]);
    const rows = json.table.rows;
    const tableBody = $("#trialTable").find("tbody");

    tableBody.empty();

    rows.forEach((row, rowIndex) => {
        let $tr = $("<tr></tr>");
        row.c.forEach((cell, index) => {
            let cellValue = cell !== null && cell.v !== undefined ? cell.v : "";
            if (cellValue === true) cellValue = "oui";
            if (cellValue === false) cellValue = "non";

            if (index === 1) {
                const nextCellValue = row.c[index + 1] ? row.c[index + 1].v : "";
                cellValue = `${cellValue}<br><br>vs.<br><br>${nextCellValue}`;
            } else if (index === 2 || index === 4) {
                return;
            } else if (index === 3 && row.c[index + 1].v === true) {
                cellValue = `${cellValue}<br><br>(AVEC JURY)`;
            }

            let $td = $("<td></td>");

            if (index === 0) {
                $td.html(`
                    <div>
                        <button class="btn-up" data-row="${rowIndex}" data-index="${index}" delta="1">▲</button>
                        <span class="value">${cellValue}</span>
                        <br><br><br>
                    </div>
                `);

                const ipColumn = row.c[7] ? row.c[7].v : "";
                if (ipColumn.includes("+" + getUserID())) {
                    $td.find(".btn-up").addClass("active");
                }
            } else {
                $td.html(cellValue);
            }

            $tr.append($td);
        });
        tableBody.append($tr);
    });

    $(".btn-up").on("click", function () {
        handleVote($(this));
    });
}



// Vote

async function checkAndMarkVotes() {
    const query = "SELECT G, H";
    const url = `https://docs.google.com/spreadsheets/d/1dFnNy_fPp-xiR3kVabNzKukSjG9p8eIF2c-qUupwCnM/gviz/tq?tq=${encodeURIComponent(query)}&tqx=out:json`;
    fetch(url)
        .then(response => response.text())
        .then(text => {
            const json = JSON.parse(text.substring(47, text.length - 2));
            const rows = json.table.rows;

            $(".btn-up").each(function () {
                const $button = $(this);
                const rowIndex = $button.data("row");

                if (rows[rowIndex]) {
                    const voters = rows[rowIndex].c[1]?.v?.split(",") || [];
                    if (voters.includes(getUserID())) {
                        $button.addClass("active");
                    }
                }
            });
        });
}

function uuidv4() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, c =>
    (+c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> +c / 4).toString(16)
  );
}

function getUserID() {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
}

async function handleVote($button) {
    const delta = parseInt($button.attr("delta"), 10);
    const $valueSpan = $button.siblings(".value");
    let currentValue = parseInt($valueSpan.text(), 10) || 0;

    const isUndo = $button.hasClass("active");
    let newValue = isUndo ? Math.max(0, currentValue - delta) : currentValue + delta;

    $button.toggleClass("active");
    $valueSpan.text(newValue);

    const payload = {
        action: isUndo ? "unvote" : "vote",
        row: $button.data("row") + 1,
        ip: getUserID()
    };

    fetch(`https://script.google.com/macros/s/AKfycbw5vuvx1ZBE42KdiH2agfo0uv4cc4KdBICz5E0-wvbVa1D6nHWQdO5EO5tG76D6mV7M/exec`, { 
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
}
