// my-app/app/game/page.tsx
"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Game.module.css';

const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const OBJECT_SIZE = 30;
const OBJECT_FALL_SPEED = 4;
const OBJECT_SPAWN_INTERVAL = 500;

interface GameObject {
  id: number;
  x: number;
  y: number;
}

export default function GamePage() {
  const [playerName, setPlayerName] = useState('');
  const [isNameSubmitted, setIsNameSubmitted] = useState(false);
  const [paddleX, setPaddleX] = useState(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [score, setScore] = useState(0);
  const [localHighScore, setLocalHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState('');

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(0);
  const lastObjectSpawnTimeRef = useRef<number>(0);

  useEffect(() => {
    const storedHighScore = localStorage.getItem('fallingObjectsLocalHighScore');
    if (storedHighScore) {
      setLocalHighScore(parseInt(storedHighScore, 10));
    }
  }, []);

  const saveScoreToDB = async (name: string, finalScore: number) => {
    try {
      const response = await fetch('/api/save-score', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ playerName: name, score: finalScore }),
      });
      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to save score:', data.error, data.details);
        setFeedbackMessage(`Error saving score: ${data.details || data.error}`);
      } else {
        console.log('Score saved:', data.message);
        setFeedbackMessage('Score saved to database!');
      }
    } catch (error) {
      console.error('Network error saving score:', error);
      setFeedbackMessage('Network error. Could not save score.');
    }
  };

  const gameLoop = useCallback(async (timestamp: number) => {
    if (!isPlaying) return;

    setObjects(prevObjects =>
      prevObjects
        .map(obj => ({ ...obj, y: obj.y + OBJECT_FALL_SPEED }))
        .filter(obj => {
          if (
            obj.y + OBJECT_SIZE >= GAME_HEIGHT - PADDLE_HEIGHT &&
            obj.y < GAME_HEIGHT - PADDLE_HEIGHT + OBJECT_FALL_SPEED &&
            obj.x + OBJECT_SIZE > paddleX &&
            obj.x < paddleX + PADDLE_WIDTH
          ) {
            setScore(s => s + 1);
            return false;
          }
          if (obj.y > GAME_HEIGHT) {
            setIsPlaying(false);
            setIsGameOver(true);
            if (playerName.trim()) { // Ensure playerName is not just whitespace
              saveScoreToDB(playerName, score);
            }
            if (score > localHighScore) {
              setLocalHighScore(score);
              localStorage.setItem('fallingObjectsLocalHighScore', score.toString());
            }
            return false;
          }
          return true;
        })
    );

    if (timestamp - lastObjectSpawnTimeRef.current > OBJECT_SPAWN_INTERVAL) {
      lastObjectSpawnTimeRef.current = timestamp;
      const newObject: GameObject = {
        id: Date.now(),
        x: Math.random() * (GAME_WIDTH - OBJECT_SIZE),
        y: 0,
      };
      setObjects(prevObjects => [...prevObjects, newObject]);
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [isPlaying, paddleX, score, localHighScore, playerName]);

  useEffect(() => {
    if (isPlaying) {
      lastObjectSpawnTimeRef.current = performance.now();
      requestRef.current = requestAnimationFrame(gameLoop);
    } else {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    }
    return () => {
      if (requestRef.current) {
        cancelAnimationFrame(requestRef.current);
      }
    };
  }, [isPlaying, gameLoop]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!gameAreaRef.current || !isPlaying) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      let newPaddleX = event.clientX - rect.left - PADDLE_WIDTH / 2;
      newPaddleX = Math.max(0, Math.min(newPaddleX, GAME_WIDTH - PADDLE_WIDTH));
      setPaddleX(newPaddleX);
    };

    const gameAreaElement = gameAreaRef.current;
    if (gameAreaElement && isPlaying) {
        gameAreaElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
        if (gameAreaElement) {
            gameAreaElement.removeEventListener('mousemove', handleMouseMove);
        }
    };
  }, [isPlaying]);

  const initializeAndStartGame = () => {
    setScore(0);
    setObjects([]);
    setPaddleX(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
    setIsGameOver(false);
    setFeedbackMessage('');
    setIsPlaying(true);
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedPlayerName = playerName.trim();
    if (trimmedPlayerName === '') {
      setFeedbackMessage('Please enter your name.');
      return;
    }
    setPlayerName(trimmedPlayerName); // Store the trimmed name
    setIsNameSubmitted(true);
    initializeAndStartGame();
  };

  const restartGameWithSamePlayer = () => {
    if (!isNameSubmitted || playerName.trim() === '') {
        setFeedbackMessage('Error: Player name not set for restart.');
        return;
    }
    initializeAndStartGame();
  };

  const resetGameForNewPlayer = () => {
    setIsPlaying(false);
    setIsGameOver(false);
    setIsNameSubmitted(false);
    setPlayerName('');
    setScore(0);
    setObjects([]);
    setFeedbackMessage('');
  };

  if (!isNameSubmitted) {
    return (
      <div className={styles.container}>
        <h1>Enter Your Name</h1>
        <form onSubmit={handleNameSubmit} className={styles.nameForm}>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="Enter your name"
            className={styles.nameInput}
            maxLength={50}
          />
          <button type="submit" className={styles.startButton}>
            Set Name & Start Game
          </button>
        </form>
        {feedbackMessage && <p className={styles.feedbackMessage} style={{ color: 'red' }}>{feedbackMessage}</p>}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <h1>接住掉落物就喜欢林瑞瑞一次!</h1>
      <div className={styles.scoreBoard}>
        Player: {playerName} | 喜欢次数: {score} | 最高喜欢: {localHighScore}
      </div>

      {!isPlaying && isGameOver && (
        <div style={{ marginTop: '20px', marginBottom: '20px' }}>
         <button onClick={restartGameWithSamePlayer} className={styles.startButton}>
            玩同样的名字再来一次
         </button>
         <button onClick={resetGameForNewPlayer} className={styles.startButton} style={{marginLeft: '10px', backgroundColor: '#f0ad4e'}}>
            换个名字玩
         </button>
        </div>
      )}

      {isGameOver && <p className={styles.gameOverText}>游戏结束!</p>}
      {/* Feedback message for game screen (e.g., score saved, errors) */}
      {/* Show this feedback only if not on the initial name entry screen and there's a message */}
      {feedbackMessage && (
          <p 
            className={styles.feedbackMessage} 
            style={{ color: feedbackMessage.toLowerCase().includes('error') || feedbackMessage.toLowerCase().includes('failed') ? 'red' : 'green' }}
          >
            {feedbackMessage}
          </p>
        )}

      <div
        ref={gameAreaRef}
        className={styles.gameArea}
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {isPlaying && (
          <>
            <div
              className={styles.paddle}
              style={{
                left: paddleX,
                width: PADDLE_WIDTH,
                height: PADDLE_HEIGHT,
              }}
            />
            {objects.map(obj => (
              <div
                key={obj.id}
                className={styles.object}
                style={{
                  left: obj.x,
                  top: obj.y,
                  width: OBJECT_SIZE,
                  height: OBJECT_SIZE,
                }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  );
}