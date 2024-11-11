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
  const [selectedSquare, setSelectedSquare] = useState(null);
  const [whiteTime, setWhiteTime] = useState(600);
  const [blackTime, setBlackTime] = useState(600);
  const [playerColor, setPlayerColor] = useState(null); // New state
  const [gameOver, setGameOver] = useState(false);
  const socketRef = useRef();

  useEffect(() => {
    // Connect to the server
    socketRef.current = io('http://localhost:4000');

    // Join a game room (you can use a unique room ID)
    const roomId = 'room1'; // Replace with dynamic ID as needed
    socketRef.current.emit('joinGame', roomId);

    // Receive player color
    socketRef.current.on('playerColor', (color) => {
      console.log(color)
      setPlayerColor(color);
    });

    // If spectator
    socketRef.current.on('spectator', () => {
      console.log('spectator')
      setStatus('You are a spectator');
    });

    // Update game state
    socketRef.current.on('gameState', (fen) => {
      setFen(fen);
      const newGame = new Chess(fen);
      setGame(newGame);
      console.log(fen)
    });

    // Handle move made by opponent
    socketRef.current.on('moveMade', (move) => {
      var newm = game.move(move);
      console.log(move);
      setFen(game.fen());
      // const newMoves = [...moves];
      console.log(game.turn())
      console.log('move', newm.san)
      console.log('move state', moves)


    setMoves(moves=>{
      const newMoves = [...moves];

      if (game.turn() === 'b') {
        newMoves.push([newm.san]);
      } else {
        newMoves[newMoves.length - 1].push(newm.san);
      }
      return newMoves

    });
      console.log('move state', moves)


    });

    // Handle game over
    socketRef.current.on('gameOver', () => {
      setStatus('Game Over');
      setGameOver(true);
    });

    // Cleanup on unmount
    return () => {
      socketRef.current.disconnect();
    };
  }, []);

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
    var legalMove = 0;
    try{
    legalMove = game.move(move);}
    catch(error){legalMove =null}
    if (legalMove === null) return;

    // Update game state
    setFen(game.fen());
    setStatus('');
    console.log(game.turn())


    socketRef.current.emit('move', move);
  };

  const onDrop = ({ sourceSquare, targetSquare }) => {
    handleMove(sourceSquare, targetSquare);
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
          orientation={playerColor === 'b' ? 'black' : 'white'} // Set board orientation
        />
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
