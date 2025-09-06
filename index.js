import { GoogleGenAI } from "@google/genai";
import { CONFIG } from "./config.js";

const SYSTEM_INSTRUCTION =
  "Be concise. 10 words or fewer. Don't be conversational, just try to answer. Plain text only, no markdown.";
const PLACEHOLDER_TEXT = "Begin your thought";
const API_KEY = CONFIG.API_KEY;

const inputAreaElement = document.getElementById("input-area");
const inputElement = document.getElementById("input");
const outputElement = document.getElementById("output");
const timerElement = document.getElementById("timer");
const chatContainer = document.getElementById("chat-container");
const mainMessage = document.getElementById("main-message");
const mainMessageContent = mainMessage.querySelector(".message-content");
const mainMessageTimer = mainMessage.querySelector(".message-timer");

if (
  !inputAreaElement ||
  !inputElement ||
  !outputElement ||
  !timerElement ||
  !chatContainer ||
  !mainMessage ||
  !mainMessageContent ||
  !mainMessageTimer
) {
  throw new Error(
    "Critical error: A required element was not found in the DOM."
  );
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const chat = ai.chats.create({
  model: "gemini-2.5-flash-lite",
  config: {
    systemInstruction: SYSTEM_INSTRUCTION,
    thinkingConfig: { thinkingBudget: 0 },
  },
});

let timerInterval;
let isRequestInProgress = false;
let currentResponseStartTime = 0;

const stopAnimations = () => {
  if (timerInterval) {
    clearInterval(timerInterval);
    timerInterval = undefined;
  }
};

const updateTimer = (startTime) => {
  if (!mainMessageTimer) return;

  const duration = (performance.now() - startTime) / 1000;
  mainMessageTimer.textContent = `${duration.toFixed(2)}s`;
};

const updateMainMessage = (content, isLoading = false) => {
  if (isLoading) {
    mainMessage.classList.add("is-loading");
  } else {
    mainMessage.classList.remove("is-loading");
  }

  mainMessageContent.innerHTML = content;
};

const handleSubmit = async () => {
  if (
    isRequestInProgress ||
    inputElement.classList.contains("is-placeholder")
  ) {
    return;
  }

  const userInput = inputElement.innerText.trim();
  if (!userInput) {
    return;
  }

  // Store the user's query for display
  const userQuery = `<div class="user-query">${userInput}</div>`;

  // Clear input and reset placeholder
  inputElement.innerText = "";
  setupPlaceholder();

  const prompt = userInput + " ...";
  isRequestInProgress = true;
  stopAnimations();

  // Show loading state with user query
  updateMainMessage(userQuery + "...", true);

  currentResponseStartTime = performance.now();

  // Start live timer
  timerInterval = setInterval(() => {
    updateTimer(currentResponseStartTime);
  }, 50);

  try {
    const result = await chat.sendMessageStream({ message: prompt });
    let responseText = "";

    for await (const chunk of result) {
      responseText += chunk.text;
      updateMainMessage(userQuery + responseText, true);
    }

    // Remove loading class once complete
    mainMessage.classList.remove("is-loading");

    // If empty response, show an error
    if (!responseText.trim()) {
      updateMainMessage(userQuery + "No response received", false);
    }
  } catch (error) {
    console.error("API Error:", error);
    mainMessage.classList.remove("is-loading");
    updateMainMessage(
      userQuery + "An error occurred. Please try again.",
      false
    );
  } finally {
    stopAnimations();

    // Update final timer value
    updateTimer(currentResponseStartTime);

    isRequestInProgress = false;
  }
};

const setupPlaceholder = () => {
  if (inputElement.innerText.trim() === "") {
    inputElement.innerText = PLACEHOLDER_TEXT;
    inputElement.classList.add("is-placeholder");
  }
};

inputElement.addEventListener("keydown", (e) => {
  if (inputElement.classList.contains("is-placeholder")) {
    if (e.key.length === 1 || e.key === "Backspace" || e.key === "Delete") {
      inputElement.innerText = "";
      inputElement.classList.remove("is-placeholder");
    }
  }

  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleSubmit();
  }
});

inputElement.addEventListener("blur", () => {
  setupPlaceholder();
});

inputAreaElement.addEventListener("click", (e) => {
  if (e.target === inputAreaElement) {
    inputElement.focus();
  }
});

setupPlaceholder();
inputElement.focus();
