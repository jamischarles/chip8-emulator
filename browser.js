// TODO:
// Add pause button on the page...
// Consider adding all the state info in the UI... - DONE
// Consider making the state re-windable...
// Consider adding a "pause on UI draw"
// consider ability to modify state from the UI with inputs and "apply state" button
// Consider adding a "unpause for 1 cycle" button - DONE
// - It shouldn't be too hard since the 'state' is just the main thing. If we make it immutable it should be easy enough...

// Fix the ball issues.
// - Only bounces off the top edge, not the other edges...
// fix the drawing issues
//  - xor toggle - DONE?
//  - out of bounds drawing...
//    - see if state.screen should start at 1. Seems to always be off by just 1...
//    - wrapping seems to wipe out what I have...
//  - remove `undefined` check...
// - Get keyboard input to work
//
//
// debugging details
var debug = true;
function debug() {
  if (!debug) return;

  console.log.apply(arguments);
}


// util function
function pad(n, width, z) {
  z = z || '0';
  n = n + '';
  return n.length >= width ? n : new Array(width - n.length + 1).join(z) + n;
}

var allCodes = [];

// var loopCount = 0;
var stopAfterLoopCount = 2200; // stop after 300 loops (only for debugging)
//
// "The Chip 8 has 35 opcodes which are all two bytes long" -> http://www.multigesture.net/articles/how-to-write-an-emulator-chip-8-interpreter/
var opcode = 0 // Refers to the current instruction being executed. Current opcode



var memory = [] // (4096 items) Memory is stored in an array each position will hold one byte. The Chip 8 has 4K memory in total.

// var V = [] // CPU registers: The Chip 8 has 15 8-bit general purpose registers named V0,V1 up to VE. The 16th register is used  for the ‘carry flag’.
          // Eight bits is one byte so we can use an unsigned char for this purpose: (in c)
// v[ii] = 0 for ii in [0..0xF] # There are 16 registers, we just reset them all to 0
// main variables we care about...
var state = {
  V: [], // CPU registers: The Chip 8 has 15 8-bit general purpose registers named V0,V1 up to VE. The 16th register is used  for the ‘carry flag’.
  I: 0, // INDEX Register
  pc: 0, // // Refers to the program counter, which is the memory address of the next instruction to be proccessed
  screen: [], // 64 x 32 (rows)
  stack: [], // 16 levels of the stack. Needed when you call a subroutine, so you know where to jump back to after the subroutine ends (similar to recursion).
  sp: 0, // stack pointer (current position of the stack)
  loopCount: 0, // FIXME: For testing only...
  paused: false, // will pause the cpu cycle...

// Finally, the Chip 8 has a HEX based keypad (0x0-0xF), you can use an array to store the current state of the key.
  keys: [], // 16 length

  // Interupts and hardware registers. The Chip 8 has none, but there are two timer registers that count at 60 Hz.
  // When set above zero they will count down to zero.
  delayTimer: 0, // will decrement at a rate of 60hz
  soundTimer: 0 // system buzzer sounds whenever timer reaches zero
}

// var x = 0; // Refers to the second position in an opcode, which most of the time is used to identify a register, reffered to as register x
// var y = 0; // Refers to the third position in an opcode, like register x, but refered to as register y

// There is an Index register I and a program counter (pc) which can have a value from 0x000 to 0xFFF
// var I = 0 // Q: Does this need to be upper case? YES, so it doesn't conflict with loops
// var pc = 0 // Refers to the program counter, which is the memory address of the next instruction to be proccessed


var f = 0xF // A static reference to register 15 (which is a special register used as a flag)

// graphics system The graphics of the Chip 8 are black and white and the screen has a total of 2048 pixels (64 x 32).
// This can easily be implemented using an array that hold the pixel state (1 or 0):
// var gfx = [] // 64 x 32 length

var prevscreen = []

// The systems memory map (memory ranges reserved):
// 0x000-0x1FF - Chip 8 interpreter (contains font set in emu)
// 0x050-0x0A0 - Used for the built in 4x5 pixel font set (0-F)
// 0x200-0xFFF - Program ROM and work RAM


// It is important to know that the Chip 8 instruction set has opcodes that allow the program to jump to a certain
// address or call a subroutine. While the specification don’t mention a stack, you will need to implement one as
// part of the interpreter yourself. The stack is used to remember the current location before a jump is performed.
// So anytime you perform a jump or call a subroutine, store the program counter in the stack before proceeding.
// The system has 16 levels of stack and in order to remember which level of the stack is used, you need to implement a stack pointer (sp).
// var stack = [] // 16 length
// var pointer = 0 // stack pointer (current position of the stack)




var bufferon = true // Used to switch between screenoutput and opcode output (used for debugging)

// font set
var chip8_fontset = [
  0xF0, 0x90, 0x90, 0x90, 0xF0, // 0
  0x20, 0x60, 0x20, 0x20, 0x70, // 1
  0xF0, 0x10, 0xF0, 0x80, 0xF0, // 2
  0xF0, 0x10, 0xF0, 0x10, 0xF0, // 3
  0x90, 0x90, 0xF0, 0x10, 0x10, // 4
  0xF0, 0x80, 0xF0, 0x10, 0xF0, // 5
  0xF0, 0x80, 0xF0, 0x90, 0xF0, // 6
  0xF0, 0x10, 0x20, 0x40, 0x40, // 7
  0xF0, 0x90, 0xF0, 0x90, 0xF0, // 8
  0xF0, 0x90, 0xF0, 0x10, 0xF0, // 9
  0xF0, 0x90, 0xF0, 0x90, 0x90, // A
  0xE0, 0x90, 0xE0, 0x90, 0xE0, // B
  0xF0, 0x80, 0x80, 0x80, 0xF0, // C
  0xE0, 0x90, 0x90, 0x90, 0xE0, // D
  0xF0, 0x80, 0xF0, 0x80, 0xF0, // E
  0xF0, 0x80, 0xF0, 0x80, 0x80  // F
];

// for easy access...
// var font = {
//   0: [0xF0, 0x90, 0x90, 0x90, 0xF0], // 0
//   1: [0x20, 0x60, 0x20, 0x20, 0x70], // 1
//   2: [0xF0, 0x10, 0xF0, 0x80, 0xF0], // 2
//   3: [0xF0, 0x10, 0xF0, 0x10, 0xF0], // 3
//   4: [0x90, 0x90, 0xF0, 0x10, 0x10], // 4
//   5: [0xF0, 0x80, 0xF0, 0x10, 0xF0], // 5
//   6: [0xF0, 0x80, 0xF0, 0x90, 0xF0], // 6
//   7: [0xF0, 0x10, 0x20, 0x40, 0x40], // 7
//   8: [0xF0, 0x90, 0xF0, 0x90, 0xF0], // 8
//   9: [0xF0, 0x90, 0xF0, 0x10, 0xF0], // 9
//   a: [0xF0, 0x90, 0xF0, 0x90, 0x90], // A
//   b: [0xE0, 0x90, 0xE0, 0x90, 0xE0], // B
//   c: [0xF0, 0x80, 0x80, 0x80, 0xF0], // C
//   d: [0xE0, 0x90, 0x90, 0x90, 0xE0], // D
//   e: [0xF0, 0x80, 0xF0, 0x80, 0xF0], // E
//   f: [0xF0, 0x80, 0xF0, 0x80, 0x80]  // F
// }

// GAME LOOP
// #include
// #include   // OpenGL graphics and input
// #include "chip8.h" // Your cpu core implementation

function loop() {
  // Set up render system and register input callbacks
  // setupGraphics();
  // setupInput();

  // Initialize the Chip8 system and load the game into the memory
  // chip8.loadGame("pong");

  // Emulation loop
    // Emulate one cycle
    chip8.emulateCycle();

    // Because the system does not draw every cycle, we should set a draw flag when we need to update our screen. Only two opcodes should set this flag:
    // 0x00E0 – Clears the screen
    // 0xDXYN – Draws a sprite on the screen
    // If the draw flag is set, update the screen
    if(chip8.drawFlag) {
      chip8.drawGraphics();
    }

    // debugger;

    // DEBUGGING: auto-pause every 300 cycles

    if (debug && state.loopCount > 0 && state.loopCount % 300 === 0 ) {
      togglePause()
    }


    // loop again..., but allow a drawing pause for the UI
    state.loopCount++;

    if (state.paused) {
      console.log('*** PAUSE ***');
      return;
    }

    setTimeout(loop, 0)
    // Store key press state (Press and Release). Store this when we press / release a key...
    // chip8.setKeys();

    // if (!stopAfterLoopCount || state.loopCount < stopAfterLoopCount) {
    // } else {
    //   console.log('*** STOPPED BECAUSE OF LOOP COUNT ***')
    //   console.log('allCodes', allCodes.join(','));
    // }
}


// FIXME: Should this be here...?
function togglePause() {
  var el = document.querySelector('.btn-pause');

  state.paused = !state.paused; // toggle state.paused

  // restart the cpu cycle
  if (state.paused === false) {
    el.innerHTML = 'Running'
    loop();
  } else {
    el.innerHTML = 'Paused'
  }
}

// show the state on the screen
function drawStateToScreen(state) {
  var el = document.querySelector('.game_state');


  // nullify screen
  state.screen = null;
  // generate the HTML for it, and dump it into the UI
  el.innerHTML = JSON.stringify(state);


}

// EMULATION CYCLE
//
// Every cycle, the method emulateCycle is called which emulates one cycle of the Chip 8 CPU.
// During this cycle, the emulator will Fetch, Decode and Execute one opcode.
var chip8 = {
  drawFlag: false,
  init: function() {

    // add event listeners
    this.addButtonListeners();

    // the system expects the application to be loaded at memory location 0x200.
    // This means that your program counter should also be set to this location.
    state.pc = 0x200 // Program counter starts at 0x200 (spot in memory)
    opcode = 0 // reset current opcode
    state.I = 0 // reset stack register
    pointer = 0 // reset stack pointer

    // Clear display (screen)  64w x 32h
    // 32 arrays (rows) of 64 length each (pixels in row)
    for (var i=0; i<32; i++) {
      state.screen[i] = [];

      for (var j=0; j<64; j++) {
        state.screen[i][j] = 0;
      }
    }

    // Clear stack

    // Clear registers V[0]-V[0xF] (0xF === 15)
    for (var i=0; i <= 0xF; i++) {
      state.V[i] = 0;
    }
    // Clear memory

    // Load fontset into memory
    // for(var i = 0; i < 80; ++i) {
    for(var i = 0; i < 80; i++) {
      memory[i] = chip8_fontset[i];
    }

    // After you have initialized the emulator, load the program into the memory
    // (use fopen in binary mode) and start filling the memory at location: 0x200 == 512.
    for(var i = 0; i < rom.data.length; ++i) {
      memory[i + 512] = rom.data[i];
    }

// 0xF0 = 11110000   ****

    // console.log('TEST', memory[0xF0])

    // console.log('memory', memory)

    // Reset timers
  },
  setKeys() {
    // chip8 has keys 0-0xF http://devernay.free.fr/hacks/chip8/C8TECH10.HTM#Fx33
    for(var i = 0; i < 0xf; i++) {
      keys[i] = 0;
    }
  },
  // for buttons outside of the chip8 canvas
  addButtonListeners() {
    var pauseEl = document.querySelector('.btn-pause');
    var pauseNextCycleEl = document.querySelector('.btn-pause-one-cycle');
    pauseEl.addEventListener('click', togglePause)

    pauseNextCycleEl.addEventListener('click', function() {
      loop();
    })
  },
  addKeyListeners() {
    // map these to and have it set the `keys[]` array
    //
    // pong listens for '1'
  },
  emulateCycle() {
    console.log('*** START CYCLE')
    // Fetch Opcode
    // During this step, the system will fetch one opcode from the memory at the location specified by the program counter (pc)
    // Fetch opcode
    opcode = memory[state.pc] << 8 | memory[state.pc + 1];
    allCodes.push(opcode.toString(16)); // for testing ONLY


    // if (opcode.toString(16) === 'ee') {
      // debugger;
    // }

    // console.log('opcode', opcode)
    matchOpCode(opcode);


    // Because every instruction is 2 bytes long, we need to increment the program counter by two after every executed opcode.
    // This is true unless you jump to a certain address in the memory or if you call a subroutine (in which case you need to
    // store the program counter in the stack). If the next opcode should be skipped, increase the program counter by four.
    // i = opcode & 0x0FFF;
    // pc += 2;

    // Update timers
    if(state.delayTimer > 0) {
      --state.delayTimer;
    }

    if(state.soundTimer > 0) {
      if(state.soundTimer == 1) {
        printf("BEEP!\n");
      }
      --state.soundTimer;
    }

    // just for printing
    var stateCopy = Object.assign({}, state)
    drawStateToScreen(stateCopy);
    stateCopy.screen = null;
    console.log('opcode.toString(16): 0x' + opcode.toString(16))
    console.log('LOOP END state', JSON.stringify(stateCopy))
    console.log('*** END CYCLE')

    // Timers
    // Besides executing opcodes, the Chip 8 also has two timers you will need to implement. As mentioned above, both
    // timers (delay timer and sound timer) count down to zero if they have been set to a value larger than zero.
    // Since these timers count down at 60 Hz, you might want to implement something that slows down your emulation cycle
    // (Execute 60 opcodes in one second).
  },
  drawGraphics: function() {
    // console.log('draw something')
    // console.log('gfx', gfx)
    drawToScreen();
    chip8.drawFlag = false;
    // var buffer, draw_timer, i, j, k, len, len1, ref, vv, xx, yy;
    //
    // buffer = "--";
    //
    // // return process.stdout.write(buffer);
    //
    // for (yy = i = 0, len = gfx.length; i < len; yy = ++i) {
    //   k = gfx[yy];
    //   ref = gfx[yy];
    //   for (xx = j = 0, len1 = ref.length; j < len1; xx = ++j) {
    //     vv = ref[xx];
    //     if (gfx[yy][xx] !== prevscreen[yy][xx]) {
    //       buffer += "\x1B[" + (yy + 1) + ";" + (xx + 0) + "H";
    //       buffer += vv ? '\x1B[42m ' : '\x1B[40m ';
    //       prevscreen[yy][xx] = gfx[yy][xx];
    //     }
    //   }
    //   buffer += '\x1B[40m ';
    // }
    //
    // if (!(draw_timer > 100)) {
    //   this.refresh();
    //   draw_timer = 0;
    // }
    //
    // draw_timer++;
    //
    // if (bufferon) {
    //   console.log('process thing ***')
    //   // process.stdout.write(buffer);
    // } else {
    //   console.log(opcode.toString(16), pc, v, x, y, memory[pc], memory[pc + 1]);
    // }

    // setTimeout(this.drawGraphics, 60);
  },
  refresh: function() {
    var i, j, results, xx, yy;
    for (yy = i = 0; i <= 31; yy = ++i) {
      prevscreen[yy] = [];
    }
    results = [];
    for (yy = j = 0; j <= 31; yy = ++j) {
      results.push((function() {
        var k, results1;
        results1 = [];
        for (xx = k = 0; k <= 63; xx = ++k) {
          results1.push(prevscreen[yy][xx] = true);
        }
        return results1;
      })());
    }
    return results;
  }
}

// FIXME: do it the hacky way first, then the proper way...
// The fancy "opcode & 0xF000" magic translates a number like 0x6a02 to 0x6000... Q: How does this work?
function matchOpCode(opcode) {
// Decode opcode
  // TODO: change the switch statement once it's  all working?
  // FIXME: fix the name of the var to something more accurate of what is happening here...
  // F000 keeps the first hex digit and makes the rest zero

  // FIXME: After this all works, consider removing the bit crazyness? or learn it properly...
  //
  //
  // Start with most specific, then go to less specifc
  // Anything with '0' will be nulled
  var firstRange = opcode & 0xF0FF; // fe33 -> f033
  var secondRange = opcode & 0xF00F; // 82e9 -> 8009
  var thirdRange = opcode & 0xF000; // this will convert 0x6134 -> 0x6000 (for easier matching). In JS we don't really need this...
  var fourthRange = opcode & 0x00FF; // 12ee -> 00ee
  // capture 0xfe33 TODO: find a better var name


  var first = codes[firstRange];
  var second = codes[secondRange];
  var third = codes[thirdRange];
  var fourth = codes[fourthRange];

  // FIXME: Write something better for this cascade...
  // FIXME: Specificity here could break us, because the specificity could vary here. We have to be careful about the order...
  if (!first && second) return second(opcode);
  if (!first && !second && third) return third(opcode);
  if (!first && !second && !third && fourth) return fourth(opcode);
  if (!first && !second && !third && !fourth) console.log("### Unknown opcode: 0x%s\n", opcode.toString(16));
  first(opcode);


}

var codes = {
    // Some opcodes //

    0xA000: function(opcode) { // ANNN: Sets I to the address NNN
        var hexCode = opcode.toString(16); // convert opcode to hex value
      // radix here refers more to source data format than dest... Interesting...
        // var nnn = opcode & 0x0FFF; // same as taking hex value of opcode and losing first byte (first digit)
        var nnn = parseInt(hexCode.slice(1), 16); // drop first hex digit // we are going FROM base16, so it needs to be noted here
        // console.log('opcode.toString(16)', opcode.toString(16))
        // console.log('hexCode.slice()', hexCode.slice(1))
        // console.log('opcode & 0x0FFF', opcode & 0x0FFF)
        // console.log('(opcode & 0x0FFF', (opcode & 0x0FFF).toString(16))
        state.I = nnn;

        state.pc += 2;
    },

    0xC000: function(opcode) { // Cxnn - Set Vx = random byte AND nn.
      // The interpreter generates a random number from 0 to 255, which is then ANDed with the value nn. The results are stored in Vx.
      // See instruction 8xy2 for more information on AND.

        var hexCode = opcode.toString(16); // convert opcode to hex value
        var x = parseInt(hexCode[1], 16);
        var nn = hexCode[2].toString() + hexCode[3];
        console.log('c000')

        var limit = 255;
        // generate random number between 0 and 255
        var rand = Math.floor(Math.random() * (limit+1));
        // console.log('nn', nn)
        // console.log('num', nn & rand)
        // console.log('num parsed', parseInt(nn,16) & rand)
        state.V[x] = parseInt(nn, 16) & rand; // FIXME: Should this be parseInt'd? That changes the value in some cases...

        state.pc += 2;
    },

    // Input  (key-press) handling)
    0xE0A1: function(opcode) { // Skip next instruction if key with the value of Vx is not pressed.
        var hexCode = opcode.toString(16); // convert opcode to hex value
        var x = parseInt(hexCode[1], 16);
      // Checks the keyboard, and if the key corresponding to the value of Vx is currently in the up position, PC is increased by 2.
      // console.log('opcode', opcode)
      // console.log('state.V[x]', state.V[x])

      var vx = state.V[x];
      // FIXME: should I loop over all, or just 'last pressed' key?

      // FIXME: Handle this properly...
      if (state.keys[vx] === 1) {
        state.pc += 2;

      }
      // skip next instruction (+4 to get to the instruction after, since the next instruction is at +2)
      state.pc += 2;
    },

    // 0x0000: function(opcode) {
      // Jump to a machine code routine at nnn.
      // This instruction is only used on the old computers on which Chip-8 was originally implemented. It is ignored by modern interpreters.
      // state.pc += 2;
    // },
    0x1000: function(opcode) { // JUMP to location nnn.
      // The interpreter sets the program counter to nnn
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var nnn = hexCode[1].toString() + hexCode[2].toString() + hexCode[3];

      console.log('nnn', nnn)
      // state.pc = parseInt(nnn, 16);
      state.pc = parseInt(nnn, 16);

    },
    0x2000: function(opcode) { // CALL subroutine at nnn.
      var hexCode = opcode.toString(16); // convert opcode to hex value

      // The interpreter increments the stack pointer, then puts the current PC on the top of the stack. The PC is then set to nnn.
      state.sp++;
      debugger;
      state.stack.push(state.pc);

      state.pc = parseInt(hexCode.slice(1), 16); // FIXME: should this be base16? YES, because the source format is Base 16 (hex)

      // console.log('0x02000')
      // console.log('opcode', opcode.toString(16))
      // console.log('hexCode', hexCode)
      // console.log('pc', pc)
    },
    0x3000: function(opcode) { // 3xnn Skip next instruction if Vx = nn.
      // The interpreter compares register Vx to nn, and if they are equal, increments the program counter by 2.
        var hexCode = opcode.toString(16); // convert opcode to hex value
        var x = parseInt(hexCode[1], 16);
        var nn = hexCode[2].toString() + hexCode[3];

        // console.log('x', x)
        // console.log('state.V[x]', state.V[x])
        // since we increment every single one by +2 I'm assuming this skips an additional block
        // FIXME: Verify ^
        if (state.V[x] == nn) { // == because sometimes it'll be '00' == 0
          state.pc += 2;
        }

        state.pc += 2;
    },

    0x4000: function(opcode) { // 4xnn Skip next instruction if Vx != nn.

      // The interpreter compares register Vx to kk, and if they are not equal, increments the program counter by 2.
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1], 16);
      var nn = hexCode[2].toString() + hexCode[3];

      // since we increment every single one by +2 I'm assuming this skips an additional block
      if (state.V[x] != nn) { // == because sometimes it'll be '00' == 0
        state.pc += 2;
      }

      state.pc += 2;
    },
    0x6000: function(opcode) { // 6XNN Store number NN in register VX. Vx = NN
        var hexCode = opcode.toString(16); // convert opcode to hex value
        // console.log('hexCode', hexCode)
        // FIXME: Would it be easier to just bitshift instead of parsing it back to int here?
        var x = parseInt(hexCode[1], 16);  // 0x6411 -> x = 4, nn = 11;
        var nn = hexCode[2].toString() + hexCode[3]; // concat [2] and [3]
        console.log('x', x)
        console.log('nn', nn)

        // FIXME: Should V[] registers contain hex strings or the number values? I'm guessing hte number values
        state.V[x] = parseInt(nn, 16);

        state.pc += 2;
    },
    0x7000: function(opcode) { // 7XNN Set Vx = Vx + nn.
        var hexCode = opcode.toString(16); // convert opcode to hex value
        var x = parseInt(hexCode[1], 16);  // 0x6411 -> x = 4, nn = 11;
        var nn = hexCode[2].toString() + hexCode[3]; // concat [2] and [3]

        // console.log('nn', nn)
        // console.log('V[x]', state.V[x])
        // console.log('***', state.V[x] + parseInt(nn, 16));
        state.V[x] = state.V[x] + parseInt(nn, 16); // FIXME: is base16 correct here? I think so...

        state.pc += 2;
    },

    // Data registers...
    // 8xx* is FOURTH range...
    0x8000: function(opcode) { // 8xyn - Set Vx = Vy. Stores the value of register Vy in register Vx.
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1],16); //
      var y = parseInt(hexCode[2],16); //
      var n = parseInt(hexCode[3],16); //

      console.log('############################')
      console.log('8xyn')
      console.log('n', n)
      console.log('x', x)
      console.log('y', y)
      console.log('V[x]', state.V[x])
      console.log('V[y]', state.V[y])

      // Should this be a switch statment?
      // if (n === 0) {
      //   state.V[x] = state.V[y];
      // }


      // 8XY2	Set VX to VX AND VY (bitwise AND)
      // console.log('BEFORE state.V[x]', state.V[x])
      if (n === 2) {
        // console.log('n=', 2)
        state.V[x] = state.V[x] & state.V[y];
        state.pc += 2;
      }

      // 8XY4	Add the value of register VY to register VX
      // Set VF to 01 if a carry occurs
      // Set VF to 00 if a carry does not occur
      if (n === 4) {
        // debugger;
        // console.log('n=', 2)
        var val = state.V[x] + state.V[y];
        // if val is greater than 8 bits (greater than 255, because 11111111 === 255)
        // then drop anything but the lowest 8 bits, and set VF to 1 (carry occurs)
        if (val > 255) {
          state.V[0xF] = 1
          // keep only 8 lowest bits
          state.V[x] = val & 0xFF; // FIXME: Verify
        } else {
          state.V[0xF] = 0
          state.V[x] = val;
        }
        state.pc += 2;
      }

      // console.log('AFTER state.V[x]', state.V[x])
      // debugger;


    },
    // FIXME: stuff still missing here...
    0xD000: function(opcode) { // Dxyn - drawing graphic pixels. ie: 0xdab6
        // Every sprite will be 8 pixels wide, and N pixels tall...

        var hexCode = opcode.toString(16); // convert opcode to hex value
        var x = parseInt(hexCode[1],16); // a
        var y = parseInt(hexCode[2],16); // b
        var n = parseInt(hexCode[3],16); // 6 // px height

        // Read n bytes from mem, starting at memory[I].
        var bytesToDraw = [];

        // FIXME: comment this better?
        for (var i=0; i < n; i++) {
          bytesToDraw.push(memory[state.I + i]);
        }

        console.log('bytesToDraw', bytesToDraw)
        var Vx = state.V[x]; // x coord
        var Vy = state.V[y]; // y coord

        console.log('Vx', Vx)
        console.log('Vy', Vy)

        // Display sprite at (Vx, Vy),
        // FIXME: if we get to the end, we need to wrap to the next row...
        // TODO: Abstract this into a separate function?
        //
        // TODO PICK UP: STA
        // 1) write a fn that converts the hex value to an string of 8 width
        // 2) Add that to the array and flip the bits
        // 3) Try to draw that (basic test to see if it works...)
        // 4) Add collision detection
        //
        // iterate over n rows (height) to draw
        for (var i=0; i < n; i++) {
          var row = Vy + i; // FIXME: Simplify this logic!!!
          var rows = state.screen;

          // TODO: make this a function
          var spriteBinary = bytesToDraw[i].toString(2);

          // iterate over x coordinate (0 is off, 1 is paint)
          for (var j=0; j < spriteBinary.length; j++) {
            var rowItem = Vx + j;


            // FIXME: Is this accurate? IF row is too high (off screen), start at 0 again...
            // Q: Should it be the next row?
            if (row > 31) { // FIXME: make this a constant
              row = row - 32; // 32 should be 0
            }

            if (rowItem > 63) { // FIXME: make this a constant
              rowItem = rowItem - 64; // 64 should be 0
            }

            // FIXME: Should we fix this?
            // if (state.screen[row] && state.screen[row][Vx+j]) {
            // debugger;
            // if(rows.length < row && rows[row].lenght < rowItem) {
            // if (typeof rows[row] != 'undefined') {
              // toggle pixel values using XOR
              var oldValue = rows[row][rowItem];
              var newValue = parseInt(spriteBinary[j], 10);

              console.log('oldValue', oldValue)
              // collision bit if we're toggling a pixel that has content (1), then set V[f] to 01
              if (oldValue != 0) {
                // debugger;
                state.V[0xf] = 1; // FIXME: Is this right? Should it be 01?
              } else {
                state.V[0xf] = 0; // FIXME: Is this right? Should it be 01?
              }
              // rows[row][rowItem] = parseInt(spriteBinary[j],10)
              // FIXME: DOCUMENT THIS REALLY WELL ****
              rows[row][rowItem] = oldValue ^ newValue;
            // }
            // }

          }
          // var xIndex
          // state.screen[row];
        }

        // for (var i=0; i < bytesToDraw.length; i++) {
          // draw the sprite that is 8px wide, for N rows based on the binary values in bytesToDraw()
          // state.screen[Vy][Vx + i] = bytesToDraw[i];


          // TODO: do the first 3 rows and see if it works...
          // dab6 (6 rows, 6px tall, 8px wide... )
          // each memory index refers to 1 row of bytes
          //240 144 144 144 240 32
        // }

        // FIXME / TODO: Add the DRAWING TO SCREEN PART
        chip8.drawFlag = true;
        // TODO: Add the collision bit part...
        //
        // set VF = collision.
        console.log('DRAW', (240).toString(2))
        //

        state.pc += 2;

    },

    /****************************
    ** Second Ranges
    /**************************/

    0xF007: function(opcode) { // Set Vx = delay timer value.  The value of DT is placed into Vx.
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1],16); //

      state.V[x] = state.delayTimer;

      state.pc += 2;
    },
    0xF015: function(opcode) { // Set delay timer = Vx.  DT is set equal to the value of Vx.
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1],16); //

      state.delayTimer = state.V[x];

      state.pc += 2;
    },
    0xF029: function(opcode) { // FX29 Set I to the memory address of the sprite data corresponding to the hexadecimal digit stored in register VX
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1],16); //

      var vx = state.V[x];
      // set I to the memory Index of wheer the sprite for that font is
      // every font is 5 rows (5 indexes).
      // 0 is at memory[0-4] 0 * 5
      // 1 is at memory[5-9] 1 * 5
      // 2 is at memory[10-9]
      state.I = vx * 5;
      // console.log('vx', vx)
      // console.log('state.I', state.I)

      state.pc += 2;


      // Set I = location of sprite for digit Vx.
      // The value of I is set to the location for the hexadecimal sprite corresponding to the value of Vx. See section 2.4, Display, for more information on the Chip-8 hexadecimal font.
    },

    0xF033: function(opcode) {// FX33 Store the binary-coded decimal equivalent of the value from register VX at addresses I, I+1, and I+2
      // The interpreter takes the decimal value of Vx, and places the hundreds digit in memory at location in I, the tens digit at location I+1, and the ones digit at location I+2.
      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1],16); //

      // The interpreter takes the decimal value of Vx,
      var dec = pad(state.V[x], 3, 0); // 0 -> "000", 3 -> "003" pad to 3 digits. 0 if not there. Convert to string

      var hundreds = parseInt(dec[0], 16);
      var tens = parseInt(dec[1], 16);
      var ones = parseInt(dec[2], 16);


      // and places the hundreds digit in memory at location in I,
      memory[state.I] = hundreds;

      // the tens digit at location I+1,
      memory[state.I+1] = tens;

      // and the ones digit at location I+2.
      memory[state.I+2] = ones;

      state.pc += 2;
    },

    0xF065: function(opcode) {
      // Read registers V0 through Vx from memory starting at location I.
      // The interpreter reads values from memory starting at location I into registers V0 through Vx.
      //
      // Fill registers V0 to VX inclusive with the values stored in memory starting at address I
      // I is set to I + X + 1 after operation
      //
      console.log('0xF065 ###################################')
      console.log('memory', memory)

      var hexCode = opcode.toString(16); // convert opcode to hex value
      var x = parseInt(hexCode[1],16); //

      // DEBUGGING ONLY
      var test = []
      // FIXME: Verify this logic is right!!!
      // for (var i=0; i <= state.V[x]; i++) {
      for (var i=0; i <= x; i++) {
        state.V[i] = memory[state.I+i];
        test.push(memory[state.I+1])
        console.log('state.I+1', state.I+1)
        console.log('loop')
      }

      console.log('test', test)
      console.log('x', x)
      console.log('state.I', state.I)

      state.I = state.I + x + 1;

      state.pc += 2;
    },
    /****************************
    ** Third Ranges
    /**************************/
    0x00ee: function(opcode) { // Return from a subroutine.
      // The interpreter sets the program counter to the address at the top of the stack, then subtracts 1 from the stack pointer.
      // console.log('#########eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee####################')

      // console.log('state.stack', state.stack )
      state.pc = state.stack[0]; // is it always top of the stack?
      state.stack.pop(); // remove stack[0] // last part of the stack

      state.sp--;

      state.pc += 2; // FIXME: verify that this is the case... I assume that if we leave this off we'll have infinite loops since this will return
      // to the same point and then run that exact same code again
      // state.loopCount = 300;
    }

}

/*
var codes = {

  // FIXME: is this right?
  0xE0: function() { // 00ee - RET
    pc = stack[--pointer]
  },
  // for the rest, we rely on the first 4 bits
  0x2000: function() {
    // TODO:  Learn what this step actually does and how it works...
    stack[pointer] = pc
    pointer++
    pc = opcode & 0x0FFF
  },
  0x6000: function() {
    V[x] = (opcode & 0xFF)
    // console.log('V[x]', V[x])
    // console.log('x', x)
  },
  0x7000: function() {
    var val = (opcode & 0xFF) + V[x]
    if (val > 255) {
      val -= 256
    }
    V[x] = val
  },
  0x8000: function() {
    V[x] = V[y]
  },
  0xD000: function() { // # Dxyn - DRAW Vx, Vy, nibble
    var x = V[(opcode & 0x0F00) >> 8];
    var y = V[(opcode & 0x00F0) >> 4];
    var height = opcode & 0x000F;
    var pixel;
    console.log('draw')
    console.log('height', height)

    V[0xF] = 0;
    for (var yline = 0; yline < height; yline++) {
      pixel = memory[I + yline];
      for(var xline = 0; xline < 8; xline++)
        {
          if((pixel & (0x80 >> xline)) != 0)
            {
              if(gfx[(x + xline + ((y + yline) * 64))] == 1)
                V[0xF] = 1;
              gfx[x + xline + ((y + yline) * 64)] ^= 1;
            }
        }
    }

    console.log('pixel', pixel)

    // FIXME: consider replacing this function with the one from the blogpost
    chip8.drawFlag = true;
  },
  0xA000: function() {
    // ANNN: Sets I to the address NNN
    // Execute opcode
    I = opcode & 0x0FFF;
    pc += 2;

    return I; // Q: Will this work?
  },


  // FIXME: Verify that this works
  0xf000: function() { // Fx65 - LD Vx, [I]
  // 0xf065: function() { // Fx65 - LD Vx, [I]
    // console.log('INSIDE 0xF065');
    for (var i = 0; i < x.length; i++) {
      v[itr] = memory[i + itr];
    }
  }
}


*/


/************************************************************
 * Drawing to the screen (implementation detail...)
 *************************************************************/
// use CSS / HTML / CSS to draw the graphic array to the screen...
function drawToScreen() {
  // create a bunch of divs
  // give them all the same class name
  // add class of 'active' to those that are active and not blank...
  var screen = state.screen;

  var div = document.createElement('div');
  var fragment = "";
  // create dom elements for pixels to draw
  // iterate each y row
  for (var y=0; y < screen.length; y++) {

    fragment += "<div class='row'>";

    // pixels in each row
    for (var x=0; x < screen[y].length; x++) {
      if (screen[y][x] === 1) {
        fragment += "<div class='pixel active'></div>";
      } else {
        fragment += "<div class='pixel'></div>";
      }
    }
    fragment += "</div>";

    div.innerHTML = fragment;

  }

  var el = document.getElementById("game_canvas");

  el.innerHTML = "";
  el.appendChild(div);

  // console.log('el', el)
}

// brings in the buffer, and turns it into hex values?...
// var rom = require('fs').readFileSync(process.argv[2]).toJSON() // Loads the room from the args supplied in the terminal
var rom = emu.pongData;
console.log('rom', rom)
// console.log('rom', rom)
chip8.init();
console.log('STARTING state', state)
loop();

// Stuff from the coffee version...
// x = 0 # Refers to the second position in an opcode, which most of the time is used to identify a register, reffered to as register x
// y = 0 # Referes to the third position in an opcode, like register x, but refered to as register y
//
// i = 0 # A special register, used ot store memory addresses
//
// f = 0xF # A static refernce to register 15 (which is a special register used as a flag)
//
// pc = 0x200 # Refers to the program counter, which is the memory address of the next instruction to be proccessed
// stack = [] # An array to keep track of subroutines, which stores memory adresses of structions that the program should return to
// pointer = 0 # The current position in the stack
//
// sound_timer = 0 #will beep if this does not equal zero, and should decrement at a rate of 60hz
// delay_timer = 0 #will dercement at a rate of 60Hz
//
// draw_timer = 0 #not part of chip8, but used to keep track of screen drawing intervals
// cycle_timer = 0 #used to control the speed in which timers decrement also not a component of chip 8
//
// screen = [] # An array that will store the xy co-ordinates that refer to pixels on a screen
// prevscreen = [] # The previous screen that is compared with the current screen, so only changes are drawn
//
// bufferon = true # Used to switch between screenoutput and opcode output (used for debugging)
//
// running = true # Used to see if the processor is paused, sometimes the processor is paused untill it recieves a key
// keydown = 0 # Used to keep track of the last key that was pressed
// keypress = 0 # Stores the function that is used to handle a keypress, which changes when the processor is paused
