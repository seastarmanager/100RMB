function GameManager(size, InputManager, Actuator, ScoreManager) {
  this.size         = size; // Size of the grid
  this.inputManager = new InputManager;
  this.scoreManager = new ScoreManager;
  this.actuator     = new Actuator;

  this.startTiles   = 2;

  this.inputManager.on("move", this.move.bind(this));
  this.inputManager.on("restart", this.restart.bind(this));
  this.inputManager.on("keepPlaying", this.keepPlaying.bind(this));

  this.setup();
}

// Restart the game
GameManager.prototype.restart = function () {
  this.actuator.continue();
  this.setup();
};

// Keep playing after winning
GameManager.prototype.keepPlaying = function () {
  //this.keepPlaying = true;
  //this.actuator.continue();
};

GameManager.prototype.isGameTerminated = function () {
  if (this.over || (this.won && !this.keepPlaying)) {
    return true;
  } else {
    return false;
  }
};

// Set up the game
GameManager.prototype.setup = function () {
  this.grid        = new Grid(this.size);

  this.score       = 0;
  this.over        = false;
  this.won         = false;
  this.keepPlaying = false;

  // Add the initial tiles
  this.addStartTiles();

  // Update the actuator
  this.actuate();
};

// Set up the initial tiles to start the game with
GameManager.prototype.addStartTiles = function () {
  for (var i = 0; i < this.startTiles; i++) {
    this.addRandomTile();
  }
};

// Adds a tile in a random position
GameManager.prototype.addRandomTile = function () {
  if (this.grid.cellsAvailable()) {
    var value = Math.random() < 0.9 ? 0.1 : 0.2;
    var tile = new Tile(this.grid.randomAvailableCell(), value);

    this.grid.insertTile(tile);
  }
};

// Sends the updated grid to the actuator
GameManager.prototype.actuate = function () {
  if (this.scoreManager.get() < this.score) {
    this.scoreManager.set(this.score);
  }

  this.actuator.actuate(this.grid, {
    score:      this.score,
    over:       this.over,
    won:        this.won,
    bestScore:  this.scoreManager.get(),
    terminated: this.isGameTerminated()
  });

};

// Save all tile positions and remove merger info
GameManager.prototype.prepareTiles = function () {
  this.grid.eachCell(function (x, y, tile) {
    if (tile) {
      tile.mergedFrom = null;
      tile.savePosition();
    }
  });
};

// Move a tile and its representation
GameManager.prototype.moveTile = function (tile, cell) {
  this.grid.cells[tile.x][tile.y] = null;
  this.grid.cells[cell.x][cell.y] = tile;
  tile.updatePosition(cell);
};

// Move tiles on the grid in the specified direction
GameManager.prototype.move = function (direction) {
  // 0: up, 1: right, 2:down, 3: left
  var self = this;

  if (this.isGameTerminated()) return; // Don't do anything if the game's over

  var cell, tile;

  var vector     = this.getVector(direction);
  var traversals = this.buildTraversals(vector);
  var moved      = false;

  // Save the current tile positions and remove merger information
  this.prepareTiles();

  // Traverse the grid in the right direction and move tiles
  traversals.x.forEach(function (x) {
    traversals.y.forEach(function (y) {
      cell = { x: x, y: y };
      tile = self.grid.cellContent(cell);

      if (tile) {
        var positions = self.findFarthestPosition(cell, vector);
        var next      = self.grid.cellContent(positions.next);
        var next2     = self.grid.cellContent(positions.next2);

        // Only one merger per row traversal?
        if (next && next.value === tile.value && !next.mergedFrom && self.is2to1(tile.value + next.value)) {
          var merged = new Tile(positions.next, self.toFaceValue(tile.value * 2));
          merged.mergedFrom = [tile, next];

          self.grid.insertTile(merged);
          self.grid.removeTile(tile);

          // Converge the two tiles' positions
          tile.updatePosition(positions.next);

          // Update the score
          self.score += merged.value;
          self.score = Math.round(self.score * 100) / 100;

          // The mighty 2048 tile
          if (merged.value === 100) self.won = true;
        } else if (next2 && next && self.is3to1(next.value + next2.value + tile.value) && !next2.mergedFrom && !next.mergedFrom) {
          var merged = new Tile(positions.next2, next.value + next2.value + tile.value);
          merged.mergedFrom =  [tile, next2];

          self.grid.removeTile(tile);
          self.grid.removeTile(next);
          self.grid.insertTile(merged);

          tile.updatePosition(positions.next2);

          self.score += merged.value;
          self.score = Math.round(self.score * 100) / 100;
          if (merged.value === 100) self.won = true;
        } else if (next2 && next && tile.value==0.2 && next.value==0.2 && next2.value==0.2 && !next2.mergedFrom && !next.mergedFrom) {//2+2+2=5+1
          var merged = new Tile(positions.next2, 0.5);
          var rest = new Tile(positions.next, 0.1);
          merged.mergedFrom = [tile, next2];
          rest.mergedFrom = [next];
          self.grid.removeTile(tile);
          //self.grid.removeTile(next);
          self.grid.insertTile(merged);
          self.grid.insertTile(rest);

          tile.updatePosition(positions.next2);
          //rest.updatePosition(positions.next);

          self.score += merged.value;
          self.score = Math.round(self.score * 100) / 100;
        } else {
          self.moveTile(tile, positions.farthest);
        }
        
        if (!self.positionsEqual(cell, tile)) {
          moved = true; // The tile moved from its original cell!
        }
      }
    });
  });

  if (moved) {
    this.addRandomTile();

    if (!this.movesAvailable()) {
      this.over = true; // Game over!
    }

    this.actuate();
  }
};

// Transfer the value to face value
GameManager.prototype.toFaceValue = function (value) {
  var map = {
    0.1: 0.1,
    0.2: 0.2,
    0.5: 0.5,
    1: 1,
    2: 2,
    4: 5,
    5: 5,
    10: 10,
    20: 20,
    40: 50,
    50: 50,
    100: 100
  }

  return map[value];
}

// Tell if the value need 2 tiles to merge
GameManager.prototype.is2to1 = function (value) {
  var map = {
    0.1: true,
    0.2: true,
    0.5: false,
    1: true,
    2: true,
    5: false,
    10: true,
    20: true,
    50: false,
    100: true
  }
  return map[value];
}

// Tell if the value need 3 tiles to merge
GameManager.prototype.is3to1 = function (value) {
  var map = {
    0.1: false,
    0.2: false,
    0.5: true,
    1: false,
    2: false,
    5: true,
    10: false,
    20: false,
    50: true,
    100: false
  }
  return map[value];
}

// Get the vector representing the chosen direction
GameManager.prototype.getVector = function (direction) {
  // Vectors representing tile movement
  var map = {
    0: { x: 0,  y: -1 }, // up
    1: { x: 1,  y: 0 },  // right
    2: { x: 0,  y: 1 },  // down
    3: { x: -1, y: 0 }   // left
  };

  return map[direction];
};

// Build a list of positions to traverse in the right order
GameManager.prototype.buildTraversals = function (vector) {
  var traversals = { x: [], y: [] };

  for (var pos = 0; pos < this.size; pos++) {
    traversals.x.push(pos);
    traversals.y.push(pos);
  }

  // Always traverse from the farthest cell in the chosen direction
  if (vector.x === 1) traversals.x = traversals.x.reverse();
  if (vector.y === 1) traversals.y = traversals.y.reverse();

  return traversals;
};

GameManager.prototype.findFarthestPosition = function (cell, vector) {
  var previous,previous2;

  // Progress towards the vector direction until an obstacle is found
  do {
    previous = cell;
    cell     = { x: previous.x + vector.x, y: previous.y + vector.y };
  } while (this.grid.withinBounds(cell) &&
           this.grid.cellAvailable(cell));
  var cell2 = cell;
  do {
    previous2 = cell2;
    cell2     = { x:previous2.x + vector.x, y: previous2.y + vector.y };
  } while (this.grid.withinBounds(cell2) &&
           this.grid.cellAvailable(cell2));

  return {
    farthest: previous,
    next: cell, // Used to check if a merge is required
    next2: cell2
  };
};

GameManager.prototype.movesAvailable = function () {
  return this.grid.cellsAvailable() || this.tileMatchesAvailable();
};

// Check for available matches between tiles (more expensive check)
GameManager.prototype.tileMatchesAvailable = function () {
  var self = this;

  var tile;

  for (var x = 0; x < this.size; x++) {
    for (var y = 0; y < this.size; y++) {
      tile = this.grid.cellContent({ x: x, y: y });

      if (tile) {
        for (var direction = 0; direction < 4; direction++) {
          var vector = self.getVector(direction);
          var cell   = { x: x + vector.x, y: y + vector.y };
          var cell2  = { x: x + vector.x * 2, y: y + vector.y * 2};

          var other  = self.grid.cellContent(cell);
          var other2 = self.grid.cellContent(cell2);

          if ((other && other.value === tile.value && self.is2to1(other.value + tile.value)) 
            || (other && other2 && self.is3to1(other.value + other2.value + tile.value))
            || (other && other2 && other.value==0.2 && other2.value==0.2 && tile.value==0.2)) {
            return true; // These tiles can be merged
          }
        }
      }
    }
  }

  return false;
};

GameManager.prototype.positionsEqual = function (first, second) {
  return first.x === second.x && first.y === second.y;
};
