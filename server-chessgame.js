// src/components/Chessboard.js

import React, { useState, useEffect, useRef } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';
import io from 'socket.io-client';

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState('');
  const [moves, setMoves] = useState([]);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [playerColor, setPlayerColor] = useState(null);
  const [gameOver, setGameOver] = useState(false);
  const socketRef = useRef();
  const whiteTimerRef = useRef();
  const blackTimerRef = useRef();

  useEffect(() => {
    // Connect to the server
    socketRef.current = io('http://localhost:4000');

    // Join a game room
    const roomId = 'room1'; // Replace with dynamic ID as needed
    socketRef.current.emit('joinGame', roomId);

    // Receive player color
    socketRef.current.on('playerColor', (color) => {
      console.log(color);
      setPlayerColor(color);
    });

    // If spectator
    socketRef.current.on('spectator', () => {
      console.log('spectator');
      setStatus('You are a spectator');
    });

    // Update game state
    socketRef.current.on('gameState', (fen) => {
      setFen(fen);
      const newGame = new Chess(fen);
      setGame(newGame);
      console.log(fen);
    });

    // Handle move made by opponent
    socketRef.current.on('moveMade', (move) => {
      const current = game.move(move);
      setFen(game.fen());


      setMoves((prevMoves) => {
        console.log(prevMoves,'prevmove')
        const newMoves = [...prevMoves];
        console.log('newmoves', newMoves)
        // const lastMove = game.history({ verbose: true }).pop();
        const lastMove = current
        console.log('lastmove', lastMove)
        if (game.turn() === 'w') {
          // Black just moved
          if (newMoves.length === 0 || newMoves[newMoves.length - 1].length === 2) {
            // newMoves.push(['', lastMove.san]);
          } else {
            newMoves[newMoves.length - 1][1] = lastMove.san;
          }
        } else {
          // White just moved
          if (newMoves.length === 0 || newMoves[newMoves.length - 1].length === 2) {
            newMoves.push([lastMove.san]);
          } else {
            newMoves[newMoves.length - 1][0] = lastMove.san;
          }
        }
        console.log(newMoves,'newmove')
        console.log(game.turn(),'turn')
        return newMoves;
      });

    });

    // Handle game over
    socketRef.current.on('gameOver', (message) => {
      setStatus(message);
      setGameOver(true);
      clearInterval(whiteTimerRef.current);
      clearInterval(blackTimerRef.current);
    });

    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

  useEffect(() => {
    if (whiteTime === 0) {
      setStatus('Game over, Black won by timeout');
      setGameOver(true);
      socketRef.current.emit('timeout');
    }
    if (blackTime === 0) {
      setStatus('Game over, White won by timeout');
      setGameOver(true);
      socketRef.current.emit('timeout');
    }
  }, [whiteTime, blackTime]);

  useEffect(() => {
    if (gameOver) {
      clearInterval(whiteTimerRef.current);
      clearInterval(blackTimerRef.current);
    }
  }, [gameOver]);

  useEffect(() => {
    if (game.turn() === 'w') {
      clearInterval(blackTimerRef.current);
      whiteTimerRef.current = setInterval(() => {
        setWhiteTime((prevTime) => Math.max(0, prevTime - 1));
      }, 1000);
    } else {
      clearInterval(whiteTimerRef.current);
      blackTimerRef.current = setInterval(() => {
        setBlackTime((prevTime) => Math.max(0, prevTime - 1));
      }, 1000);
    }

    return () => {
      clearInterval(whiteTimerRef.current);
      clearInterval(blackTimerRef.current);
    };
  }, [fen]);

  const handleMove = (sourceSquare, targetSquare) => {
    if (gameOver) return;

    // Check if it's player's turn
    if (game.turn() !== playerColor) {
      setStatus("It's not your turn");
      return;
    }

    const move = {
      from: sourceSquare,
      to: targetSquare,
      promotion: 'q',
    };

    // Validate move
    let legalMove = null;
    try {
      legalMove = game.move(move);
    } catch (error) {
      legalMove = null;
    }

    if (legalMove === null) return;

    setFen(game.fen());
    setStatus('');

    // setMoves((prevMoves) => {
    //   const newMoves = [...prevMoves];
    //   const lastMove = game.history({ verbose: true }).pop();
    //   if (game.turn() === 'w') {
    //     // Black just moved
    //     if (newMoves.length === 0 || newMoves[newMoves.length - 1].length === 2) {
    //       newMoves.push(['', lastMove.san]);
    //     } else {
    //       newMoves[newMoves.length - 1][1] = lastMove.san;
    //     }
    //   } else {
    //     // White just moved
    //     if (newMoves.length === 0 || newMoves[newMoves.length - 1].length === 2) {
    //       newMoves.push([lastMove.san]);
    //     } else {
    //       newMoves[newMoves.length - 1][0] = lastMove.san;
    //     }
    //   }
    //   return newMoves;
    // });

    socketRef.current.emit('move', move);
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    handleMove(sourceSquare, targetSquare);
  };

  const handleResign = () => {
    if (gameOver) return;
    socketRef.current.emit('resign');
  };

  return (
    <div className="chess-container">
      <div className="chessboard-wrapper">
        <div className="timer">
          <div>White: {whiteTime}</div>
          <div>Black: {blackTime}</div>
        </div>
        <Chessboard
          position={fen}
          onDrop={onDrop}
          orientation={playerColor === 'b' ? 'black' : 'white'}
        />
        {!gameOver && (
          <button onClick={handleResign} style={{ marginTop: '10px' }}>
            Resign
          </button>
        )}
        {status && <p style={{ color: 'red' }}>{status}</p>}
      </div>
      <MoveList moves={moves} />
    </div>
  );
};

const MoveList = ({ moves }) => {
  return (
    <div className="move-list">
      <h3>Move List</h3>
      <div className="move-list-container">
        <table>
          <thead>
            <tr>
              <th>Move</th>
              <th>White</th>
              <th>Black</th>
            </tr>
          </thead>
          <tbody>
            {moves.map((movePair, index) => (
              <tr key={index}>
                <td>{index + 1}</td>
                <td>{movePair[0]}</td>
                <td>{movePair[1] || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ChessGame;
