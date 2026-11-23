// Pure data shared by client and server. One file per diorama in ./scenes/<id>.js (data) and
// src/client/scenes/<id>.js (builder).
//   target: orbit centre [x,y,z]; start: the pose the player starts at; limits clamp the orbit;
//   shots: the postcard poses a daily puzzle can use, each with a difficulty level:
//     1 easy    classic three-quarter view, eye height, hero landmark centred, mid distance
//     2         a clear side or front view with two landmarks lined up
//     3         a less obvious side, or a tighter/wider framing where distance matters
//     4         low or high camera, the back of the scene, or a landmark partly hidden
//     5 hard    an unusual angle that still has one unique alignment, tight framing
import lighthouse from './lighthouse.js';
import lanterns from './lanterns.js';
import halt from './halt.js';
import polder from './polder.js';
import station from './station.js';
import observatory from './observatory.js';
import lock from './lock.js';
import tram from './tram.js';
import treehouse from './treehouse.js';
import pagoda from './pagoda.js';
import rooftop from './rooftop.js';
import circus from './circus.js';
import vineyard from './vineyard.js';
import beachhuts from './beachhuts.js';
import greenhouse from './greenhouse.js';

const ALL = [lighthouse, lanterns, halt, polder, station, observatory, lock, tram, treehouse, pagoda, rooftop, circus, vineyard, beachhuts, greenhouse];

// A scene is live once it has at least one shot. `postcard` is its first shot (the default puzzle).
export const SCENES = ALL.filter((s) => s.shots && s.shots.length).map((s) => ({ ...s, postcard: s.shots[0].pose }));

export const sceneById = (id) => SCENES.find((s) => s.id === id);
