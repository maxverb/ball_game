SWING Version

copyright © 1997 Software 2000

Contents

1.	Installation

2.	System Requirements

3.	Functions and Keyboard Layout

4.	Tips & Tricks

5.	Problems with Windows version

6.	Problems with DOS version

7.	General Problems and Hotline

8.	Licenses

1. 	Installation and Start

1.1. Installation for Windows 95
If  autoplay is activated under Windows 95, a small program called Swing Runner will automatically be accessed when the CD is inserted.
This program helps you to install SWING and Direct X, read the Readme file etc.

If  autoplay isn’t activated, the "SWINGRUN.EXE" program can be started from the CD from the Windows Explorer.

The Setup program will install SWING to the directory you select, and sets up an icon in the Windows 95 start bar, which you can use to start the game. You will find the icon to start SWING in the start bar under "Program / Software 2000".

Note: 
If you don’t yet have Direct X installed on your computer, you must do this before you start SWING. You can not play the Windows version of SWING without Direct X.

1.2 Installation for DOS or Windows DOS-Box
To install the game in DOS, start the "INSTALL.EXE" program from the CD-ROM. The program will be installed in the drive and directory you designate.

When all the data has been copied to your hard drive, the installation program will ask you if you want to install your Soundcard. If you don’t install a Soundcard, SWING will run without sound effects.

To start "SWING", call up the "SWING" directory.

2.	System Requirements

2.1 Minimum System

Processor	486 DX 2-66 +
RAM		8 MB
Hard drive	40 MB
CD-ROM	double- speed
High Res 
Graphics Card	VESA 1.2 HighColor (Vesa Local Bus or PC1) 1 MB RAM
		(640 * 480 * 32768/65535)

2.2  Recommended System

Processor	Pentium 90 +
RAM		16 MB
Hard drive	40 MB
CD-ROM	double- speed
High Res 
Graphics Card	VESA 2.0 HighColor (linear framebuffer) 1 MB RAM
	
Soundcard	any generally available soundcard

additionally:	
IPX Network	for multi-player games (up to 8 players)
Joypad

3.	Functions and Keyboard Layout

3.1 Playing the Game
The aim of the game is to collect points by throwing three spheres of the same colour next to each other. When this happens, all the spheres of that colour will disappear. This is called "getting a Three".

All the spheres except the Extras have a weight which is indicated on them.

These weights can be used to alter the see-saws. When a sphere is thrown, the distance it travels will depend on the difference in the weights on the see-saw.

To move the crane, use the cursor keys in the normal way. To drop a sphere, use the cursor-down key or press ENTER.

3.2 Function Keys

F1:	Help for Extras
F2:	Save
F3:	Joypad/joystick calibration
F4:	Sound effects/music volume
F5:	Music Box
F6:	Keyboard layout/Joypad control
F7:	Optical effects/Sphere sets
F8:	System check and version data

4.	 Tips and Tricks

Heart:	When a Heart is thrown outside the playing area, it appears on the other side as a bomb.

Bonus:	After a Three is thrown, the bonus lights 4x, 3x and 2x will light up. If you then throw another 	Three, the points will be multiplied by the amount shown by the lights.

Star:	When three silver stars are lying next to each other, the whole playing area will be cleared. The 	bonus rule applies here too.

5.	Problems with the Windows version

5.1 Direct X is not installed
SWING requires Direct X. If Direct X is not installed on your computer, you will see an error message telling you a DLL file is missing.
If this happens, install Direct X by starting it from the SWING RUNNER.

5.2 Exotic Soundcards
In the unlikely event that you have problems with installing or using Direct X with your graphics card, please contact your card’s manufacturer.

6.	 Problems with the DOS Version

6.1 Problems Initializing  Graphics
SWING uses 16-BIT graphics functions.
The program runs with
a) 640 x 480 x 32768 colors
b) 640 x 480 x 65536 colors

To display these modes, your graphics card must have at least 1 MB RAM available and have VESA 1.2 BIOS extensions.
Many graphics cards already have these graphics modes automatically installed.
If you have a graphics card which does not have these modes, start the VESA driver supplied with your card.

Alternatively, you can use the SciTech "UniVBE" program, a universal driver which supports the majority of graphics cards.
Often, the performance is better when you use "UniVBE" than by using the drivers supplied by your hardware manufacturer.

You can order UniVBE through the following channels:
www: http:/www.scitechsoft.com
ftp: ftp.scitechsoft.com
CIS: GO SCITECH
AOL: keyword SCITECH

6.2 	Black Screen directly after Starting
If your computer screen goes black (i.e. crashes!!) as soon as you install SWING, this means your graphics card is not compatible with the video player we use. If this happens, start SWING with the "NOVIDEO" parameter to prevent the video player from starting.

6.3	Video Play-back Error with some Graphics Cards
With some graphics cards, palette errors can occur during the video sequences.
Colour problems on a Matrox Millenium or Matrox Mystique card can be cured by fitting a new BIOS (Millenium 2.0 or higher / Mystique 1.4 or higher).

You can obtain a new BIOS for these Matrox cards from:
www: http:\www.matrox.com

6.4	RAM Problems
This version of SWING requires either 8 MB or 16 MB RAM. In the 8 MB version, many effects are replaced by a standard effect, whereas the 16 MB version employs the complete range of effects.

If after starting SWING an error message appears because there is not enough memory available, you can access SWING with the "LOMEM" start parameter, to make the program start the 8 MB version.

When playing in DOS you have to keep the maximum amount of memory free for SWING. You should remove all the drivers and programs you don’t need (e.g. Smartdrive etc.) from the memory. You may also have to play SWING in the Windows 95 DOS Box.

Using SWING in WINDOWS 95:
You can play SWING as a 16 MB version in Windows 95 if you allocate the full 16 MB memory to the SWING.EXE. This will also work on a computer with 8 MB RAM, but in this setting you may experience slight speed problems for a while. To allocate 16 MB RAM for SWING under Windows 95, follow these steps:
	1. Start the Explorer via the start bar
	2. Move to the SWING directory
	3. Click the SWING.EXE file with the right mouse button
	4. Click "CHARACTERISTICS" in the menu with the left mouse button
	5. Select "MEMORY" with the left mouse button
	6. Enter the value "16384" in the "Working memory for MS-DOS protection mode (DPMI)" (the last 	entry in the list).
	7. Click on "OK" to transfer the data.

6.5	Sound Effects
Your soundcard must be correctly set to reproduce the sound effects properly. This will usually be done directly during the installation process. If the soundcard settings change after installation, you can use the "SETSOUND" program to adapt the SWING sound settings.

Some soundcards use different settings under Windows 95 than under DOS. You can solve this problem by accessing "SETSOUND".

7.	General Problems

7.1 CD Music
SWING contains a number of CD tracks which provide background music. If you can’t hear any music on your system when the CD is running, this may be due to one of the following reasons:
a) Your system does not have an, audio cable from the CD-ROM to the soundcard
b) Your soundcard’s CD volume is set at zero.


8.	Licenses

Video Player	Brainstorm GmbH, Bochum

MSS		Miles Design

Installshield 3	Installshield Corp.

(You will also find this "README.TXT" in the main directory of the SWING CD.)
