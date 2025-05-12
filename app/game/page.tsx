// my-app/app/game/page.tsx
"use client"; // 标记为客户端组件，因为有交互和 localStorage

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './Game.module.css'; // 我们将创建这个 CSS 模块

const GAME_WIDTH = 600; // 游戏区域宽度
const GAME_HEIGHT = 400; // 游戏区域高度
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 20;
const OBJECT_SIZE = 30;
const OBJECT_FALL_SPEED = 4; // 物体下落速度
const OBJECT_SPAWN_INTERVAL = 200; // 物体生成间隔 (ms)

interface GameObject {
  id: number;
  x: number;
  y: number;
}

export default function GamePage() {
  const [paddleX, setPaddleX] = useState(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
  const [objects, setObjects] = useState<GameObject[]>([]);
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGameOver, setIsGameOver] = useState(false);

  const gameAreaRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(); // 用于 requestAnimationFrame
  const lastObjectSpawnTimeRef = useRef<number>(0);

  // 加载最高分
  useEffect(() => {
    const storedHighScore = localStorage.getItem('fallingObjectsHighScore');
    if (storedHighScore) {
      setHighScore(parseInt(storedHighScore, 10));
    }
  }, []);

  // 游戏主循环
  const gameLoop = useCallback((timestamp: number) => {
    if (!isPlaying) return;

    // 1. 移动物体
    setObjects(prevObjects =>
      prevObjects
        .map(obj => ({ ...obj, y: obj.y + OBJECT_FALL_SPEED }))
        .filter(obj => {
          // 2. 碰撞检测
          if (
            obj.y + OBJECT_SIZE >= GAME_HEIGHT - PADDLE_HEIGHT && // 物体底部接触或超过挡板顶部
            obj.y < GAME_HEIGHT - PADDLE_HEIGHT + OBJECT_FALL_SPEED && // 确保物体上一帧还在挡板之上
            obj.x + OBJECT_SIZE > paddleX &&
            obj.x < paddleX + PADDLE_WIDTH
          ) {
            setScore(s => s + 1);
            return false; // 物体被接住，移除
          }
          // 3. 物体掉落到底部
          if (obj.y > GAME_HEIGHT) {
            setIsPlaying(false);
            setIsGameOver(true);
            if (score > highScore) {
              setHighScore(score);
              localStorage.setItem('fallingObjectsHighScore', score.toString());
            }
            return false; // 物体掉落，移除
          }
          return true; // 保留物体
        })
    );

    // 4. 生成新物体
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
  }, [isPlaying, paddleX, score, highScore]); // 添加依赖

  // 启动和停止游戏循环
  useEffect(() => {
    if (isPlaying) {
      lastObjectSpawnTimeRef.current = performance.now(); // 重置生成计时器
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

  // 鼠标控制挡板
  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!gameAreaRef.current || !isPlaying) return;
      const rect = gameAreaRef.current.getBoundingClientRect();
      let newPaddleX = event.clientX - rect.left - PADDLE_WIDTH / 2;
      // 限制挡板在游戏区域内
      newPaddleX = Math.max(0, Math.min(newPaddleX, GAME_WIDTH - PADDLE_WIDTH));
      setPaddleX(newPaddleX);
    };

    const gameAreaElement = gameAreaRef.current; // 捕获当前 ref 值
    if (gameAreaElement) {
        gameAreaElement.addEventListener('mousemove', handleMouseMove);
    }

    return () => {
        if (gameAreaElement) {
            gameAreaElement.removeEventListener('mousemove', handleMouseMove);
        }
    };
  }, [isPlaying]); // 只在 isPlaying 变化时重新绑定或解绑

  const startGame = () => {
    setScore(0);
    setObjects([]);
    setPaddleX(GAME_WIDTH / 2 - PADDLE_WIDTH / 2);
    setIsPlaying(true);
    setIsGameOver(false);
  };

  return (
    <div className={styles.container}>
      <h1>接住掉落物几次就喜欢林瑞瑞几次</h1>
      <div className={styles.scoreBoard}>
        喜欢次数: {score} | 最高喜欢次数: {highScore}
      </div>

      {!isPlaying && (
        <button onClick={startGame} className={styles.startButton}>
          {isGameOver ? '重新喜欢' : '开始喜欢'}
        </button>
      )}

      {isGameOver && <p className={styles.gameOverText}>喜欢结束!</p>}

      <div
        ref={gameAreaRef}
        className={styles.gameArea}
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
      >
        {isPlaying && (
          <>
            {/* 挡板 */}
            <div
              className={styles.paddle}
              style={{
                left: paddleX,
                width: PADDLE_WIDTH,
                height: PADDLE_HEIGHT,
              }}
            />
            {/* 掉落物 */}
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