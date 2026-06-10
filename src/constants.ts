/** World size of one tile in game units. */
export const TILE_SIZE = 2;

/** Game camera: offset from follow target (top-down with slight tilt). */
export const CAMERA_OFFSET = { x: 0, y: 34, z: 11 } as const;
export const CAMERA_FOV = 50;
export const CAMERA_LERP = 4.5;

/** On-foot player. */
export const PLAYER_SPEED = 6.5;
export const PLAYER_RADIUS = 0.35;
export const PLAYER_MAX_HEALTH = 100;

/** Projectiles. */
export const BULLET_SPEED = 34;
export const BULLET_LIFE = 0.9;
export const BULLET_COOLDOWN = 0.16;
export const MAX_BULLETS = 64;

/** Explosions. */
export const EXPLOSION_DAMAGE_RADIUS = 4;
export const EXPLOSION_IMPULSE_RADIUS = 7;
export const EXPLOSION_CHAIN_RADIUS = 3.2;
export const EXPLOSION_DAMAGE = 65;

/** Distance to enter/exit a vehicle. */
export const CAR_ENTER_DIST = 2.4;

/** Minimum car speed (m/s) to detonate a barrel on impact. */
export const BARREL_CAR_EXPLODE_SPEED = 5;

/** Pedestrians. */
export const PED_COUNT = 240;
export const PED_WALK_SPEED = 1.6;
export const PED_FLEE_SPEED = 5.2;
export const PED_RADIUS = 0.3;
export const PED_CORPSE_TIME = 14;
export const PED_RUNOVER_SPEED = 4.5;

/** Traffic AI. */
export const TRAFFIC_COUNT = 64;
export const TRAFFIC_CRUISE = 8.5;

/**
 * Population streaming: distant NPCs recycle to a ring around the player
 * (off-camera) so the visible area stays lively without simulating the whole map.
 */
export const PED_RECYCLE_DIST = 90;
export const PED_SPAWN_MIN = 34;
export const PED_SPAWN_MAX = 72;
export const TRAFFIC_RECYCLE_DIST = 110;
export const TRAFFIC_SPAWN_MIN = 42;
export const TRAFFIC_SPAWN_MAX = 88;

/** Pickups. */
export const PICKUP_RADIUS = 1.0;
export const PICKUP_RESPAWN = 30;
export const HEALTH_PICKUP_AMOUNT = 50;

/** Car crash damage (per m/s above threshold). */
export const CRASH_DAMAGE_THRESHOLD = 7;
export const CRASH_DAMAGE_SCALE = 4.5;

/** Wanted level: accumulated heat → stars. */
export const WANTED_THRESHOLDS = [40, 120, 260, 450, 700, 1000];
export const HEAT_DECAY = 10;
export const HEAT_DECAY_DELAY = 6;
export const CRIME_PED_KILL = 45;
export const CRIME_GANG_KILL = 18;
export const CRIME_COP_KILL = 130;
export const CRIME_CAR_DESTROY = 50;
/** Heat per trigger pull, scaled by weapon cooldown (≈ sustained heat/sec). */
export const CRIME_SHOOT_RATE = 22;

/** Paint shops: clear wanted level. */
export const GARAGE_CLEAR_TIME = 0.9;
export const GARAGE_COST = 50;

/** Speed penalty off paved tiles (grass/sidewalk). */
export const OFFROAD_DRAG = 2.4;

/** Knockable props (hydrant, lamppost, traffic light). */
export const PROP_KNOCK_MIN_SPEED = 3.5;
export const PROP_KNOCK_DESPAWN = 7;
export const HYDRANT_WATER_TIME = 10;
export const HYDRANT_DESPAWN = 13;

/** Occupants ejected when stealing a moving car. */
export const EJECT_PASSENGER_CHANCE = 0.4;
export const EJECT_DOWNED_TIME = 1.0;
export const ANGRY_TIME = 11;
export const PUNCH_REACH = 1.3;
export const PUNCH_COOLDOWN = 0.9;
export const PUNCH_DAMAGE = 6;

/** Police. */
export const MAX_COPS = 8;
export const COP_SPEED = 5.0;
export const COP_SHOOT_RANGE = 9;
export const COP_SHOOT_COOLDOWN = 1.1;
export const COP_BULLET_DAMAGE = 8;
export const MAX_POLICE_CARS = 3;
export const POLICE_CRUISE = 13.5;

/** Medics: ambulance dispatch to revive downed pedestrians. */
export const MEDIC_SPEED = 3.8;
export const MEDIC_HEAL_TIME = 5;
export const MEDIC_DISPATCH_COOLDOWN = 15;
export const MEDIC_DETECT_DIST = 70;
export const AMBULANCE_ARRIVE_DIST = 22;
export const AMBULANCE_STUCK_DIST = 34;
export const AMBULANCE_STUCK_TIME = 2.5;
export const POLICE_DEPLOY_DIST = 16;
export const POLICE_DEPLOY_SPEED = 2.8;
export const AMBULANCE_CRUISE = 14;

/** Gangs. */
export const GANG_MEMBERS_PER_GANG = 11;
export const GANG_SPEED = 4.6;
export const GANG_SHOOT_RANGE = 10;
export const GANG_SHOOT_COOLDOWN = 0.55;
export const GANG_BULLET_DAMAGE = 5;
export const GANG_AGGRO_DIST = 28;
export const GANG_KILL_RESPECT = -35;
export const GANG_RESPECT_MAX = 25;
export const GANG_RESPECT_REGEN = 0.5;

/** Cash rewards for chaos (player-attributed only). */
export const MONEY_PED = 10;
export const MONEY_GANG = 25;
export const MONEY_COP = 100;
export const MONEY_CAR = 50;

/** Minimum car speed to damage on-foot player on hit. */
export const RUNOVER_PLAYER_SPEED = 5.5;

/** Camera: extra height at max speed (world units). */
export const CAMERA_SPEED_ZOOM = 16;
