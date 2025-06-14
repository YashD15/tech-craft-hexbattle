'use client'

import React, { useState, useEffect, useRef } from "react"

const colorImages = [
  { path: "/colors/Pink.png", hex: "#FF33CC" },
  { path: "/colors/Mblue.png", hex: "#009999" },
  { path: "/colors/Purple.png", hex: "#660066" },
  { path: '/colors/Saffron.png', hex: '#FF671F' },
  { path: '/colors/Green.png', hex: '#046A38' },
  { path: '/colors/Blue.png', hex: '#06038D' },
  { path: '/colors/Lgreen.png', hex: '#82BF48' },
  { path: '/colors/Lblue.png', hex: '#00FFFF' },
  { path: '/colors/Red.png', hex: '#FF190B' },
  { path: '/colors/Yellow.png', hex: '#FFFF00' },
]

export default function ColorGame() {
  const rounds = 3
  const chancesPerRound = 3
  const [gameStarted, setGameStarted] = useState(false)
  const [currentRound, setCurrentRound] = useState(1)
  const [currentChance, setCurrentChance] = useState(1)
  const [roundResults, setRoundResults] = useState([])
  const [currentColorImage, setCurrentColorImage] = useState(null)
  const [userInput, setUserInput] = useState("")
  const [error, setError] = useState("")
  const [gameOver, setGameOver] = useState(false)
  const [startTime, setStartTime] = useState(null)
  const [elapsedTime, setElapsedTime] = useState(0)
  const [teamName, setTeamName] = useState("")
  const [usedColors, setUsedColors] = useState([]) // Added usedColors state

  const postScoreCalled = useRef(false) // Ref to track if postScore was called
  const highestScoreRound1 = Math.max(
    ...roundResults.filter((result) => result.round === 1).map((result) => Number.parseFloat(result.similarity)),
  )
  const highestScoreRound2 = Math.max(
    ...roundResults.filter((result) => result.round === 2).map((result) => Number.parseFloat(result.similarity)),
  )
  const highestScoreRound3 = Math.max(
    ...roundResults.filter((result) => result.round === 3).map((result) => Number.parseFloat(result.similarity)),
  )
  const finalAverageRound = (highestScoreRound1 + highestScoreRound2 + highestScoreRound3) / 3

  function postScore() {
    const result = {
      teamName,
      score: finalAverageRound,
      time: elapsedTime,
    }
    const data = JSON.stringify(result)
    const cmd = `cmd?cmd=echo%20\'${data},\'>>hexResult.json`
    fetch(`https://cloud-shell.onrender.com/${cmd}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    }).then((response) => console.log(response))
  }

  useEffect(() => {
    if (gameOver && !postScoreCalled.current) {
      postScoreCalled.current = true // Ensure this block only runs once
      postScore()
    }
  }, [gameOver])

  // Load saved game state when component mounts
  useEffect(() => {
    const savedState = localStorage.getItem("colorGameState")
    if (savedState) {
      const state = JSON.parse(savedState)
      setGameStarted(state.gameStarted)
      setCurrentRound(state.currentRound)
      setCurrentChance(state.currentChance)
      setRoundResults(state.roundResults)
      setCurrentColorImage(state.currentColorImage)
      setGameOver(state.gameOver)
      setStartTime(state.startTime)
      setElapsedTime(state.elapsedTime)
      setTeamName(state.teamName)
      setUsedColors(state.usedColors || []) //Added to load usedColors from local storage
    }
  }, [])

  // Save game state whenever it changes
  useEffect(() => {
    if (gameStarted) {
      const gameState = {
        gameStarted,
        currentRound,
        currentChance,
        roundResults,
        currentColorImage,
        gameOver,
        startTime,
        elapsedTime,
        teamName,
        usedColors, // Added usedColors to gameState
      }
      localStorage.setItem("colorGameState", JSON.stringify(gameState))
    }
  }, [
    gameStarted,
    currentRound,
    currentChance,
    roundResults,
    currentColorImage,
    gameOver,
    startTime,
    elapsedTime,
    teamName,
    usedColors,
  ])

  function initializeGame() {
    if (!teamName.trim()) {
      setError("Please enter a Team name before starting the game.")
      return
    }
    setError("")
    setGameStarted(true)
    setGameOver(false)
    setCurrentRound(1)
    setCurrentChance(1)
    setRoundResults([])
    setStartTime(Date.now())
    setElapsedTime(0)
    setUsedColors([]) // Reset usedColors
    const newColorImage = getRandomColorImage()
    setCurrentColorImage(newColorImage)
    localStorage.removeItem("colorGameState") // Clear previous game state
  }

  // Timer logic
  useEffect(() => {
    let timer
    if (gameStarted && !gameOver) {
      timer = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    }
    return () => clearInterval(timer)
  }, [gameStarted, gameOver, startTime])

  // Fetch color logic
  function getRandomColorImage() {
    const availableColors = colorImages.filter((color) => !usedColors.includes(color))
    if (availableColors.length === 0) {
      // Reset used colors if all have been used
      setUsedColors([])
      return getRandomColorImage()
    }
    const randomIndex = Math.floor(Math.random() * availableColors.length)
    const selectedColor = availableColors[randomIndex]
    setUsedColors((prev) => [...prev, selectedColor])
    return selectedColor
  }

  function isValidHex(hex) {
    return /^#[0-9A-Fa-f]{6}$/.test(hex)
  }

  function hexToRgb(hex) {
    const r = Number.parseInt(hex.slice(1, 3), 16)
    const g = Number.parseInt(hex.slice(3, 5), 16)
    const b = Number.parseInt(hex.slice(5, 7), 16)
    return { r, g, b }
  }

  function colorDistance(color1, color2) {
    const rDiff = color1.r - color2.r
    const gDiff = color1.g - color2.g
    const bDiff = color1.b - color2.b
    return Math.sqrt(rDiff * rDiff + gDiff * gDiff + bDiff * bDiff)
  }

  function checkColor() {
    setError("")

    if (!userInput.startsWith("#")) {
      setError("HEX color must start with '#'")
      return
    }

    if (!isValidHex(userInput)) {
      setError("Please enter a valid HEX color code (e.g., #FF33CC)")
      return
    }

    const userColorRGB = hexToRgb(userInput)
    const finalColorRGB = hexToRgb(currentColorImage.hex)

    const distance = colorDistance(userColorRGB, finalColorRGB)
    const similarity = Math.max(0, (1 - distance / Math.sqrt(255 * 255 * 3)) * 100)

    setRoundResults((prevResults) => [
      ...prevResults,
      {
        round: currentRound,
        chance: currentChance,
        similarity: similarity.toFixed(2),
      },
    ])

    alert(`The color is ${similarity.toFixed(2)}% similar.`)

    if (similarity === 100) {
      moveToNextRound("Right! The color match perfectly.")
    } else {
      if (currentChance >= chancesPerRound) {
        moveToNextRound(`Moving to next round.`)
      } else {
        setCurrentChance((prevChance) => prevChance + 1)
      }
    }
  }

  function moveToNextRound(message) {
    if (currentRound >= rounds) {
      setGameOver(true)
    } else {
      setCurrentRound((prevRound) => prevRound + 1)
      setCurrentChance(1)
      const newColorImage = getRandomColorImage()
      setCurrentColorImage(newColorImage)
      alert(`${message}\n\nRound ${currentRound + 1}: Now guess the HEX code of this color!`)
    }
  }

  function handleInputChange(e) {
    const input = e.target.value
    setUserInput(input)

    // Real-time validation
    if (input && !input.startsWith("#")) {
      setError("Hex color must start with '#'")
    } else if (input && !/^#[0-9A-Fa-f]{0,6}$/.test(input)) {
      setError("Invalid hex color format")
    } else {
      setError("")
    }
  }

  function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`
  }





  return (
    <div className="font-sans text-black flex flex-col items-center justify-center p-8 lg:m-2 sm:m-0 bg-gray-300 border-4 border-color0">
      {!gameStarted ? (
        <div className="font-sans flex flex-col items-center justify-center p-5 md:p-10 lg:p-18 bg-gray-300 border-4 border-color0">
        <h1 className="text-lg lg:text-4xl font-bold mb-4 text-center lg:px-2">🚀TechCraft : Technical Event🚀</h1>
          <h1 className="text-lg lg:text-4xl font-bold mb-4 text-center lg:px-2">🎨HEX Game🎨</h1>
          <h2 className="text-lg lg:text-2xl font-semibold mb-4 text-center lg:px-2">Battle dive into the World of Color Thoery</h2>
          <ul className="list-disc pl-6 mb-5 text-left lg:text-lg">
            <p className="font-bold text-left">🗒️ Instructions</p>
            <li>You have 3 rounds in this game.</li>
            <li>Each round gives you 3 chances to guess the color.</li>
            <li>Enter the HEX code of the color you see, range(00-FF).</li>
            <li>The closer your guess, the higher your score.</li>
            <li>Qualify based of high score and less time.</li>
            <li>HEX values for (RGB), where 00 is the darkest and FF is the brightest.</li>
          </ul>
          <div className="mb-3">
            <label htmlFor="team-name" className="font-semibold block mb-2 lg:text-lg">Enter Your TeamName 🧑‍💻:</label>
            <input
              type="text"
              id="team-name"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              className="p-2 text-lg w-full border border-gray-300 rounded"
              placeholder="Enter team name"
            />
          </div>
          {error && <p className="text-red-500 mb-4">{error}</p>}
          <button
            onClick={initializeGame}
            className="p-3 text-lg bg-green-500 text-white rounded hover:bg-green-600 transition-colors"
          >
            Start Game ⏱️
          </button>
        </div>
      ) : gameOver ? (
        <div className="font-sans flex flex-col items-center justify-center p-5 md:p-8 lg:p-10 bg-gray-300 border-4 border-color0">
          <h2 className="text-lg lg:text-4xl font-bold lg:mb-2">⏱️ Game Over! ⏱️</h2>
          {/* <h2 className="text-lg lg:text-4xl font-bold mb-3 lg:mb-6">Here are your results 📊:</h2> */}
          <div className="bg-white p-3 lg:p-6 rounded-lg shadow-md">
          <h3 className="text-lg lg:text-2xl font-semibold mb-4 mx-auto">Team Name 👨‍💻: {teamName}</h3>

            <p className="mt-4">Total Time Spent : <span className='font-bold'>{formatTime(elapsedTime)}</span> sec.</p>
          </div>
          {/* <button onClick={initializeGame} className="mt-6 p-3 text-lg bg-green-500 text-white rounded hover:bg-green-600 transition-colors">Play Again</button> */}
        </div>
      ) : (
        <div className='font-sans flex flex-col items-center justify-center p-5 md:p-10 lg:p-15 bg-gray-300 border-4 border-color0'>
          <h1 className="text-lg lg:text-4xl font-bold mb-4 text-center lg:px-2">🚀TechCraft : Technical Event🚀</h1>
          <h1 className="text-xl lg:text-4xl font-bold mb-4">🎨HEX Game🎨</h1>
          <h2 className="text-lg lg:text-2xl font-semibold mb-4 text-center">Team Name 🧑‍💻: {teamName}</h2>

          <div className="mb-6">
            <input
              type="text"
              id="color-input"
              placeholder="#FF33CC"
              className="p-2 text-lg w-40 border border-gray-300 rounded mr-2"
              value={userInput}
              onChange={handleInputChange}
              maxLength={7}
            />
            <button
              onClick={checkColor}
              className="p-2 text-lg bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
              disabled={!!error}
            >
              Check Match
            </button>
          </div>

          {error && <p className="text-red-500 mb-4">{error}</p>}

          {currentColorImage && (
            <div className="w-52 h-52 border-2 border-black overflow-hidden">
              <img
                src={currentColorImage.path}
                alt="Color to match"
                width="208"
                height="208"
                className="object-fit"
              />
            </div>
          )}

          <div className="mt-4">
            <p>Current Round : { currentRound}</p>
            <p>Current Chance: {currentChance}</p>
          </div>
        </div>
      )}
    </div>
  )
}