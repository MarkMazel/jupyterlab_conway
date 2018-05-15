import {
  JupyterLab, JupyterLabPlugin, ILayoutRestorer
} from '@jupyterlab/application';

import {
  ICommandPalette, InstanceTracker
} from '@jupyterlab/apputils';

import {
  JSONExt
} from '@phosphor/coreutils';

import {
  Message
} from '@phosphor/messaging';

import {
  Widget
} from '@phosphor/widgets';

import '../style/index.css';

/**
 * Amount of squares in board width.
 */
var width: number = 50;
/**
 * Amount of squares in board height.
 */
var height: number = 50;

/**
 * Reset state bitmatrix.
 */
function cleanState(inArr: boolean[][]) {
  for(var i = 0; i < width; i++){
    inArr[i] = [];
    for(var j = 0; j < height; j++){
      inArr[i][j] = false;
    }
  }
}

/**
 * Redraw board.
 */
function redraw(inCtx: CanvasRenderingContext2D){
  inCtx.fillStyle = "white";
  inCtx.fillRect(0, 0, width*10, height*10);
  inCtx.beginPath();
  for(var i = 0; i <= width*10; i=i+10){
    inCtx.moveTo(i,0);
    inCtx.lineTo(i,height*10);
  }
  for(var j = 0; j <= height*10; j=j+10){
    inCtx.moveTo(0,j);
    inCtx.lineTo(width*10,j);
  }
  inCtx.moveTo(0,0);
  inCtx.stroke();
};

/**
 * Draw current state from input.
 */
function drawState(inCtx: CanvasRenderingContext2D, inArr: boolean[][]){
  inCtx.fillStyle = "black";
  for(var i = 0; i < inArr.length; i++){
    for(var j = 0; j < inArr[0].length; j++) {
      if(inArr[i][j]) {
        inCtx.fillRect((i*10), (j*10), 10, 10);
      }
    }
  }
  inCtx.stroke();
};

/**
 * Count neighbors of given cell.
 */
function countNeighbors(inArr: boolean[][], inX: number, inY: number):number{
  var count = 0;
  for(var i = inX - 1; i <= inX + 1; i++) {
    for(var j = inY - 1; j <= inY + 1; j++) {
      if((i >= 0 && j >=0) && !(i == inX && j == inY) && (i < width && j < height)) {
        if(inArr[i][j]) {
          count++;
        }
      }
    }
  }
  return count;
};

/**
 * Take step from current board state to next board state.
 */
function takeStep(inCtx: CanvasRenderingContext2D, inArr: boolean[][]){
  var deltaPlus = [];
  var deltaMinus = [];
  var currTup = [];
  for(var i = 0; i < width; i++) {
    for(var j = 0; j < height; j++) {
      var neigh = countNeighbors(inArr, i, j);
      if(inArr[i][j]){
        if(neigh < 2) {
          deltaMinus.push([i,j]);
        }
        if(neigh > 3) {
          deltaMinus.push([i,j]);
        }
      } else {
        if(neigh == 3) {
          deltaPlus.push([i,j]);
        }
      }
    }
  }
  
  var plusLen = deltaPlus.length;
  for(var x = 0; x < plusLen; x++) {
    currTup = deltaPlus.pop();
    inArr[currTup[0]][currTup[1]] = true;
  }
  var minusLen = deltaMinus.length;
  for(var x = 0; x < minusLen; x++) {
    currTup = deltaMinus.pop();
    inArr[currTup[0]][currTup[1]] = false;
  }
  drawState(inCtx, inArr);
};

/**
 * A Conway's Game of Life Widget.
 */
class ConwayWidget extends Widget {
  /**
   * Construct a new conway's game widget.
   */
  constructor() {
    super();

    this.id = 'test-jupyterlab';
    this.title.label = 'test widget v1';
    this.title.closable = true;
    this.addClass('jp-conwayWidget');

    this.cnvs = document.createElement('canvas');
    this.cnvs.id = 'cnvs';
    this.cnvs.className = 'jp-testCanvas';
    this.cnvs.height = height*10;
    this.cnvs.width = width*10;
    this.cnvs.onclick = (event: MouseEvent) => {``
      this.state[Math.floor(event.offsetX/10)][Math.floor(event.offsetY/10)] = !this.state[Math.floor(event.offsetX/10)][Math.floor(event.offsetY/10)];
      
      redraw(this.ctx);
      drawState(this.ctx, this.state);
    };
    this.node.appendChild(this.cnvs);

    this.cntrlDiv = document.createElement('div');
    this.cntrlDiv.id = 'cntrlDiv';
    this.cntrlDiv.align = 'center';

    this.txt = document.createElement('textarea');
    this.txt.id = 'txt';
    this.txt.rows = 5;
    this.txt.style.width = "50%";
    this.txt.className = 'jp-testInput';
    this.cntrlDiv.appendChild(this.txt);

    this.gen = document.createElement('button');
    this.gen.id = 'gen';
    this.gen.className = 'jp-testButton';
    this.gen.innerHTML = 'generate';
    this.gen.style.width = "50%";
    this.gen.onclick = () => {
      cleanState(this.state);
      redraw(this.ctx);
      var lines = this.txt.value.split('\n');
      var isGood = true;
      for(var i = 0; i < lines.length; i++) {
        var curr = lines[i].split(',');
        if(curr.length != 2) {
          this.txt.value += "\nLine #" + i + " doesn't have two values, please enter values of the form x,y";
          isGood = false;
        }
        else if(Number(curr[0])>=width || Number(curr[0])<0) {
          this.txt.value += "\nLine #" + i + " x value is too high, please enter a positive value lower than " + width;
          isGood = false;
        }
        else if(Number(curr[1])>=height || Number(curr[1])<0) {
          this.txt.value += "\nLine #" + i + " y value is too high, please enter a positive value lower than " + height;
          isGood = false;
        }
        else if(isNaN(Number(curr[0])) || isNaN(Number(curr[1]))) {
          this.txt.value += "\nLine #" + i + " has non-numeric values";
          isGood = false;
        }
        if(isGood) {
          this.state[Number(curr[0])][Number(curr[1])] = true;
        }
      }
      if(isGood) {
        this.txt.style.color = "black";
        drawState(this.ctx, this.state);
      } else {
        this.txt.style.color = "red";
      }
    };
    this.cntrlDiv.appendChild(this.gen);

    this.step = document.createElement('button');
    this.step.id = 'gen';
    this.step.className = 'jp-testButton';
    this.step.innerHTML = 'step';
    this.step.style.width = "50%";
    this.step.onclick = () => {
      redraw(this.ctx);

      takeStep(this.ctx, this.state);
    };
    this.cntrlDiv.appendChild(this.step);

    this.node.appendChild(this.cntrlDiv);
  }

  /**
   * The input textarea associated with the widget.
   */
  txt: HTMLTextAreaElement;
  /**
   * The main canvas associated with the widget.
   */
  cnvs: HTMLCanvasElement;
  /**
   * The main canvas' context.
   */
  ctx: CanvasRenderingContext2D;
  /**
   * The generate button associated with the widget.
   */
  gen: HTMLButtonElement;
  /**
   * The step button associated with the widget.
   */
  step: HTMLButtonElement;
  /**
   * The div which holds (txt, gen, and step) associated with the widget.
   */
  cntrlDiv: HTMLDivElement;
  /**
   * The bitmatrix storing the state of the Conway board.
   */
  state: boolean[][] = [];

  /**
   * Handle update requests for the widget.
   */
  onUpdateRequest(msg: Message): void {
    this.ctx = this.cnvs.getContext("2d");

    cleanState(this.state);

    redraw(this.ctx);
  }
};

/**
 * Activate the conway widget extension.
 */
function activate(app: JupyterLab, palette: ICommandPalette, restorer: ILayoutRestorer) {
  console.log('JupyterLab extension jupyterlab_conway is activated!');

  // Declare a widget variable
  let widget: ConwayWidget;

  // Add an application command
  const command: string = 'conway:open';
  app.commands.addCommand(command, {
    label: 'Conway\'s Game of Life',
    execute: () => {
      if (!widget) {
        // Create a new widget if one does not exist
        widget = new ConwayWidget();
        widget.update();
      }
      if (!tracker.has(widget)) {
        // Track the state of the widget for later restoration
        tracker.add(widget);
      }
      if (!widget.isAttached) {
        // Attach the widget to the main work area if it's not there
        app.shell.addToMainArea(widget);
      } else {
        // Refresh the comic in the widget
        widget.update();
      }
      // Activate the widget
      app.shell.activateById(widget.id);
    }
  });

  // Add the command to the palette.
  palette.addItem({ command, category: 'Tutorial' });

  // Track and restore the widget state
  let tracker = new InstanceTracker<Widget>({ namespace: 'conway' });
  restorer.restore(tracker, {
    command,
    args: () => JSONExt.emptyObject,
    name: () => 'conway'
  });
};

/**
 * Initialization data for the jupyterlab_conway extension.
 */
const extension: JupyterLabPlugin<void> = {
  id: 'jupyterlab_conway',
  autoStart: true,
  requires: [ICommandPalette, ILayoutRestorer],
  activate: activate
};

export default extension;
