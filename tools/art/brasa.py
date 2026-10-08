from hand import render, scale

PAL = {
    'a': '#f08a52', 'h': '#b8472d', 'H': '#82291c', 'D': '#521912',
    's': '#f8d5bb', 'S': '#e2a98c',
    'e': '#2b1d2f', 'i': '#e04444', 'I': '#8e1f2a', 'w': '#ffffff', 'm': '#a64c45', 'b': '#f5a49a',
    'q': '#5d5869', 'c': '#3e3a48', 'C': '#2a2731',
    'y': '#f26a6a', 'r': '#cc3138', 'R': '#8c1d27',
    'p': '#2f2c36', 'P': '#1f1d25', 'k': '#26232b', 'K': '#4a4553',
    'W': '#ffffff', 'g': '#dbe2ec', 'G': '#8d97a6', 't': '#6b4a33', 'T': '#d9ad52',
}

ROWS = [
    '................................',
    '...............aa...............',
    '............aahha...............',
    '..........aahhhhhaa.............',
    '.........ahhhhhahhhha...........',
    '........ahhhhhahhhhhhh..........',
    '.......ahhhhhahhhhhahhh.........',
    '.......hhhhhhhhhhhhhhhhhh.......',
    '......Hhhhhhhhhhhhhhhhhhh.......',
    '.....HHhhhHhhhhHhhhhhHhhh.......',
    '....DHHhhHsHhhhsHhhhssHhh.......',
    '...DDHhhhsssshssssssssssH.......',
    '...DHHhhsseesssssssseessH.......',
    '..DDHHhhssiwssssssssiwssS.......',
    '..DHHhhhssIissssssssIissS.......',
    '..DH.Hhhbsssssssssssssbs........',
    '..D...HhSsssssssmsssssS.........',
    '.......HDSSssssssssSSS..........',
    '...........ryyrrrrrrr...........',
    '..........crryyrrrrrRc..........',
    '.........qcrRRrrrrrRccq.........',
    '.........qcRrRRRRRRRcccq..tT....',
    '.........qcrRcqccccccccqss.tT.gW',
    '.........sscRcqcccccccccss...gWG',
    '.........sSCRcqcccccccc.....gWG.',
    '..........CcRcqccccccc.....gWG..',
    '...........ppppppppppp....gWG...',
    '...........pppP...pppp...gWG....',
    '...........pppP...pppp..gWG.....',
    '..........KkkkP...KkkkkGG.......',
    '..........Kkkkk...Kkkkkk........',
    '..........kkkkk...kkkkkk........',
]

if __name__ == '__main__':
    scale(render(ROWS, PAL), 12).save('brasa.png')
