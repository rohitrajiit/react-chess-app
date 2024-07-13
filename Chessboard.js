import React, { useState } from 'react';
import Chessboard from 'chessboardjsx';
import { Chess } from 'chess.js';

const ChessGame = () => {
  const [game, setGame] = useState(new Chess());
  const [fen, setFen] = useState(game.fen());
  const [status, setStatus] = useState('');
  const [moves, setMoves] = useState([]);

  const onDrop = ({ sourceSquare, targetSquare }) => {
    let move
    try {
        try{
       move= game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: 'q' // Always promote to a queen for simplicity
      });}
      catch(error){
        move = null
      }

      setFen(game.fen());
      if (game.isCheckmate()){
        if (game.turn() === 'b'){
        setStatus('Game over, White won by checkmate');}
        else{
            setStatus('Game over, Black won by checkmate');
        }
        console.log(game.turn())
        return

      }

      if (game.isDraw()){

        setStatus('Game is Draw');
        return

      }
      if (move === null) {
        
        return;
      }

      setStatus('');
      const newMoves = [...moves];
      console.log(game.turn())
      if (game.turn() === 'b') {
        newMoves.push([move.san]);
      } else {
        newMoves[newMoves.length - 1].push(move.san);
      }
      setMoves(newMoves);
    } catch (error) {
      console.error('An error occurred:', error);
      setStatus('An unexpected error occurred. Please try again.');
    }
  };




const handleNewGame = () => {
    const newGame = new Chess();
    setGame(newGame);
    setFen(newGame.fen());
    setMoves([]);
    setStatus('');
  };

  const handleSavePGN = () => {
    const pgn = game.pgn();
    const element = document.createElement("a");
    const file = new Blob([pgn], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = "game.pgn";
    document.body.appendChild(element);
    element.click();
  };

  const handleLoadPGN = () => {
    const pgn = prompt('Please enter the PGN:');
    if (pgn) {
      const newGame = new Chess();
      if (newGame.loadPgn(pgn)) {
        setGame(newGame);
        setFen(newGame.fen());
        setMoves(pgnToMoves(newGame.history({ verbose: true })));
        setStatus('');
      } else {
        alert('Invalid PGN');
      }
    }
  };

  const pgnToMoves = (history) => {
    const newMoves = [];
    for (let i = 0; i < history.length; i += 2) {
      newMoves.push([history[i]?.san, history[i + 1]?.san]);
    }
    return newMoves;
  };

  return (
    <div className="chess-container">
      <div className="chessboard-wrapper">
        <Chessboard position={fen} onDrop={onDrop} />
        {status && <p style={{ color: 'red' }}>{status}</p>}
        <div className="controls">
          <button onClick={handleNewGame}>New Game</button>
          <button onClick={handleSavePGN}>Save PGN</button>
          <button onClick={handleLoadPGN}>Load PGN</button>
        </div>
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
