// ========================================
// 깨어난 방 (Awakened Room) - 3D Horror Game
// ========================================

// Game State
const GameState = {
    LOADING: 'loading',
    MENU: 'menu',
    PLAYING: 'playing',
    PAUSED: 'paused',
    GAME_OVER: 'gameOver',
    VICTORY: 'victory'
};

// Game Phase (progression through the game)
const GamePhase = {
    ROOM1: 'room1',           // First room with 3 doors
    CORRIDOR: 'corridor',      // Long corridor with monster
    ROOM2: 'room2'            // Final room with 3 doors
};

let currentState = GameState.LOADING;
let currentPhase = GamePhase.ROOM1;

// Three.js Core Variables
let scene, camera, renderer;
let clock;

// Player Controls
let controls = {
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    canJump: false,
    isRunning: false
};

let velocity = new THREE.Vector3();
let direction = new THREE.Vector3();
let playerSpeed = 5.0;
let runSpeed = 10.0;

// Camera Controls
let yaw = 0;
let pitch = 0;
let isPointerLocked = false;

// Game Objects
let room = {};
let corridor = {};
let doors = [];
let secondDoors = [];
let monster = null;
let monsterActive = false;
let lights = [];
let playerInCorridor = false;

// Audio
let audioContext;
let sounds = {};

// Raycaster for interaction
let raycaster = new THREE.Raycaster();
let interactableObjects = [];

// Mobile controls
let isMobile = false;
let joystickActive = false;
let joystickDirection = { x: 0, y: 0 };
let touchStartX = 0;
let touchStartY = 0;

// ========================================
// Initialization
// ========================================

function init() {
    console.log('Initializing game...');

    // Create Three.js scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x000000, 1, 50);

    // Create camera (first-person view)
    camera = new THREE.PerspectiveCamera(
        75, // FOV
        window.innerWidth / window.innerHeight, // Aspect ratio
        0.1, // Near plane
        1000 // Far plane
    );
    camera.position.set(0, 1.6, 0); // Eye level height

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    document.body.appendChild(renderer.domElement);

    // Clock for delta time
    clock = new THREE.Clock();

    // Create the room
    createRoom();

    // Create corridor
    createCorridor();

    // Create lighting
    createLighting();

    // Create doors
    createDoors();

    // Create monster
    createMonster();

    // Detect mobile
    detectMobile();

    // Setup event listeners
    setupEventListeners();

    // Setup mobile controls
    if (isMobile) {
        setupMobileControls();
    }

    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.display = 'none';
        currentState = GameState.MENU;
    }, 1000);

    console.log('Game initialized!');
}

// ========================================
// Room Creation
// ========================================

function createRoom() {
    const roomSize = 20;
    const wallHeight = 5;
    const wallThickness = 0.5;

    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8,
        metalness: 0.2
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1
    });

    const ceilingMaterial = new THREE.MeshStandardMaterial({
        color: 0x151515,
        roughness: 0.9,
        metalness: 0.1
    });

    // Floor
    const floorGeometry = new THREE.BoxGeometry(roomSize, 0.1, roomSize);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.position.y = 0;
    floor.receiveShadow = true;
    scene.add(floor);
    room.floor = floor;

    // Ceiling
    const ceilingGeometry = new THREE.BoxGeometry(roomSize, 0.1, roomSize);
    const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
    ceiling.position.y = wallHeight;
    ceiling.receiveShadow = true;
    scene.add(ceiling);
    room.ceiling = ceiling;

    // Walls
    room.walls = [];

    // Front wall (with door gap)
    const frontWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry(7, wallHeight, wallThickness),
        wallMaterial
    );
    frontWallLeft.position.set(-6.5, wallHeight/2, -roomSize/2);
    frontWallLeft.castShadow = true;
    frontWallLeft.receiveShadow = true;
    scene.add(frontWallLeft);
    room.walls.push(frontWallLeft);

    const frontWallRight = new THREE.Mesh(
        new THREE.BoxGeometry(7, wallHeight, wallThickness),
        wallMaterial
    );
    frontWallRight.position.set(6.5, wallHeight/2, -roomSize/2);
    frontWallRight.castShadow = true;
    frontWallRight.receiveShadow = true;
    scene.add(frontWallRight);
    room.walls.push(frontWallRight);

    // Back wall
    const backWall = new THREE.Mesh(
        new THREE.BoxGeometry(roomSize, wallHeight, wallThickness),
        wallMaterial
    );
    backWall.position.set(0, wallHeight/2, roomSize/2);
    backWall.castShadow = true;
    backWall.receiveShadow = true;
    scene.add(backWall);
    room.walls.push(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
        wallMaterial
    );
    leftWall.position.set(-roomSize/2, wallHeight/2, 0);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    room.walls.push(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, roomSize),
        wallMaterial
    );
    rightWall.position.set(roomSize/2, wallHeight/2, 0);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    room.walls.push(rightWall);

    console.log('Room created');
}

// ========================================
// Corridor Creation
// ========================================

function createCorridor() {
    const corridorLength = 100;
    const corridorWidth = 8;
    const wallHeight = 5;
    const wallThickness = 0.5;
    const endRoomWidth = 15; // Wider end room for 3 doors

    // Materials
    const wallMaterial = new THREE.MeshStandardMaterial({
        color: 0x2a2a2a,
        roughness: 0.8,
        metalness: 0.2
    });

    const floorMaterial = new THREE.MeshStandardMaterial({
        color: 0x1a1a1a,
        roughness: 0.9,
        metalness: 0.1
    });

    // Corridor floor
    const corridorFloorGeometry = new THREE.BoxGeometry(corridorWidth, 0.1, corridorLength);
    const corridorFloor = new THREE.Mesh(corridorFloorGeometry, floorMaterial);
    corridorFloor.position.set(0, 0, -10 - corridorLength/2);
    corridorFloor.receiveShadow = true;
    scene.add(corridorFloor);
    corridor.floor = corridorFloor;

    // End room floor (wider area for doors)
    const endRoomFloorGeometry = new THREE.BoxGeometry(endRoomWidth, 0.1, 10);
    const endRoomFloor = new THREE.Mesh(endRoomFloorGeometry, floorMaterial);
    endRoomFloor.position.set(0, 0, -115);
    endRoomFloor.receiveShadow = true;
    scene.add(endRoomFloor);

    // Corridor ceiling
    const corridorCeiling = new THREE.Mesh(corridorFloorGeometry.clone(), wallMaterial);
    corridorCeiling.position.set(0, wallHeight, -10 - corridorLength/2);
    corridorCeiling.receiveShadow = true;
    scene.add(corridorCeiling);
    corridor.ceiling = corridorCeiling;

    // End room ceiling
    const endRoomCeiling = new THREE.Mesh(endRoomFloorGeometry.clone(), wallMaterial);
    endRoomCeiling.position.set(0, wallHeight, -115);
    endRoomCeiling.receiveShadow = true;
    scene.add(endRoomCeiling);

    // Corridor walls
    corridor.walls = [];

    // Left wall (corridor)
    const leftWallGeometry = new THREE.BoxGeometry(wallThickness, wallHeight, corridorLength);
    const leftWall = new THREE.Mesh(leftWallGeometry, wallMaterial);
    leftWall.position.set(-corridorWidth/2, wallHeight/2, -10 - corridorLength/2);
    leftWall.castShadow = true;
    leftWall.receiveShadow = true;
    scene.add(leftWall);
    corridor.walls.push(leftWall);

    // Right wall (corridor)
    const rightWall = new THREE.Mesh(leftWallGeometry.clone(), wallMaterial);
    rightWall.position.set(corridorWidth/2, wallHeight/2, -10 - corridorLength/2);
    rightWall.castShadow = true;
    rightWall.receiveShadow = true;
    scene.add(rightWall);
    corridor.walls.push(rightWall);

    // End room walls (left and right)
    const endRoomLeftWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, 10),
        wallMaterial
    );
    endRoomLeftWall.position.set(-endRoomWidth/2, wallHeight/2, -115);
    endRoomLeftWall.castShadow = true;
    endRoomLeftWall.receiveShadow = true;
    scene.add(endRoomLeftWall);
    corridor.walls.push(endRoomLeftWall);

    const endRoomRightWall = new THREE.Mesh(
        new THREE.BoxGeometry(wallThickness, wallHeight, 10),
        wallMaterial
    );
    endRoomRightWall.position.set(endRoomWidth/2, wallHeight/2, -115);
    endRoomRightWall.castShadow = true;
    endRoomRightWall.receiveShadow = true;
    scene.add(endRoomRightWall);
    corridor.walls.push(endRoomRightWall);

    // Transition walls (connect corridor to end room)
    const transitionWallLeft = new THREE.Mesh(
        new THREE.BoxGeometry((endRoomWidth - corridorWidth) / 2, wallHeight, wallThickness),
        wallMaterial
    );
    transitionWallLeft.position.set(-(corridorWidth/2 + (endRoomWidth - corridorWidth)/4), wallHeight/2, -110);
    transitionWallLeft.castShadow = true;
    transitionWallLeft.receiveShadow = true;
    scene.add(transitionWallLeft);
    corridor.walls.push(transitionWallLeft);

    const transitionWallRight = new THREE.Mesh(
        new THREE.BoxGeometry((endRoomWidth - corridorWidth) / 2, wallHeight, wallThickness),
        wallMaterial
    );
    transitionWallRight.position.set((corridorWidth/2 + (endRoomWidth - corridorWidth)/4), wallHeight/2, -110);
    transitionWallRight.castShadow = true;
    transitionWallRight.receiveShadow = true;
    scene.add(transitionWallRight);
    corridor.walls.push(transitionWallRight);

    // Back wall segments (with door gaps) - 3 doors
    const backWallSegments = [
        { x: -6, width: 3 },     // Left segment
        { x: -2.5, width: 1.5 }, // Between door 1 and 2
        { x: 0, width: 1.5 },    // Between door 2 and 3
        { x: 2.5, width: 1.5 },  // Between door 3 and right
        { x: 6, width: 3 }       // Right segment
    ];

    backWallSegments.forEach(segment => {
        const wallSegment = new THREE.Mesh(
            new THREE.BoxGeometry(segment.width, wallHeight, wallThickness),
            wallMaterial
        );
        wallSegment.position.set(segment.x, wallHeight/2, -120);
        wallSegment.castShadow = true;
        wallSegment.receiveShadow = true;
        scene.add(wallSegment);
        corridor.walls.push(wallSegment);
    });

    console.log('Corridor created with end room');
}

// ========================================
// Lighting
// ========================================

function createLighting() {
    // Ambient light (brighter for better visibility)
    const ambientLight = new THREE.AmbientLight(0x606060, 0.6);
    scene.add(ambientLight);

    // Point light in center of room (main light source)
    const pointLight = new THREE.PointLight(0xffaa55, 2, 40);
    pointLight.position.set(0, 4, 0);
    pointLight.castShadow = true;
    pointLight.shadow.mapSize.width = 1024;
    pointLight.shadow.mapSize.height = 1024;
    scene.add(pointLight);
    lights.push(pointLight);

    // Flickering effect for the main light
    pointLight.userData.originalIntensity = 2;
    pointLight.userData.flickerTime = 0;

    // Corridor lights (evenly spaced)
    for (let i = 0; i < 10; i++) {
        const corridorLight = new THREE.PointLight(0xffaa55, 1.5, 20);
        corridorLight.position.set(0, 4, -15 - (i * 10));
        corridorLight.castShadow = true;
        scene.add(corridorLight);
        lights.push(corridorLight);

        corridorLight.userData.originalIntensity = 1.5;
        corridorLight.userData.flickerTime = Math.random() * 10;
    }

    // End room light (brighter to see all 3 doors)
    const endRoomLight = new THREE.PointLight(0xffaa55, 3, 30);
    endRoomLight.position.set(0, 4, -115);
    endRoomLight.castShadow = true;
    scene.add(endRoomLight);
    lights.push(endRoomLight);
    endRoomLight.userData.originalIntensity = 3;
    endRoomLight.userData.flickerTime = 0;

    console.log('Lighting created');
}

// ========================================
// Doors Creation
// ========================================

function createDoors() {
    const doorWidth = 2;
    const doorHeight = 3.5;
    const doorThickness = 0.2;

    const doorMaterial = new THREE.MeshStandardMaterial({
        color: 0x4a2c2a,
        roughness: 0.7,
        metalness: 0.3
    });

    // === FIRST SET: Three doors in front wall ===
    const doorPositions = [-3, 0, 3];

    doorPositions.forEach((xPos, index) => {
        // Door frame
        const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
        const door = new THREE.Mesh(doorGeometry, doorMaterial);
        door.position.set(xPos, doorHeight/2, -10 + doorThickness);
        door.castShadow = true;
        door.receiveShadow = true;
        scene.add(door);

        // Door number marker
        const markerGeometry = new THREE.BoxGeometry(0.3, 0.3, 0.05);
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: index === 1 ? 0x00ff00 : 0xff0000 // Door 2 (index 1) is correct (green), others red
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(xPos, doorHeight - 0.5, -10);
        scene.add(marker);

        // Store door data
        door.userData.doorIndex = index;
        door.userData.isCorrect = (index === 1); // Middle door is correct
        door.userData.type = 'door';
        door.userData.doorSet = 1; // First set

        doors.push(door);
        interactableObjects.push(door);
    });

    // === SECOND SET: Three doors at end of corridor ===
    const corridorEndZ = -120;
    const secondDoorPositions = [-4, 0, 4]; // Spread out more for visibility

    secondDoorPositions.forEach((xPos, index) => {
        // Door frame
        const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, doorThickness);
        const door = new THREE.Mesh(doorGeometry, doorMaterial.clone());
        door.position.set(xPos, doorHeight/2, corridorEndZ);
        door.castShadow = true;
        door.receiveShadow = true;
        scene.add(door);

        // Door number marker
        const markerGeometry = new THREE.BoxGeometry(0.4, 0.4, 0.05);
        const correctIndex = 0; // First door (left) is correct for second set
        const markerMaterial = new THREE.MeshBasicMaterial({
            color: index === correctIndex ? 0x00ff00 : 0xff0000
        });
        const marker = new THREE.Mesh(markerGeometry, markerMaterial);
        marker.position.set(xPos, doorHeight - 0.5, corridorEndZ + 0.3);
        scene.add(marker);

        // Store door data
        door.userData.doorIndex = index;
        door.userData.isCorrect = (index === correctIndex);
        door.userData.type = 'door';
        door.userData.doorSet = 2; // Second set

        secondDoors.push(door);
        interactableObjects.push(door);
    });

    console.log('Doors created (2 sets)');
}

// ========================================
// Monster Creation
// ========================================

function createMonster() {
    // Monster body (bigger and more visible)
    const monsterGroup = new THREE.Group();

    // Body (tall, imposing rectangle)
    const bodyGeometry = new THREE.BoxGeometry(1.5, 3, 1.2);
    const bodyMaterial = new THREE.MeshStandardMaterial({
        color: 0x0a0a0a,
        roughness: 0.8,
        emissive: 0x660000,
        emissiveIntensity: 0.5
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 1.5;
    body.castShadow = true;
    monsterGroup.add(body);

    // Head (bigger)
    const headGeometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.y = 3.6;
    head.castShadow = true;
    monsterGroup.add(head);

    // Glowing red eyes (much bigger and brighter)
    const eyeGeometry = new THREE.SphereGeometry(0.2, 16, 16);
    const eyeMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        emissive: 0xff0000,
        emissiveIntensity: 2
    });

    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(-0.3, 3.8, 0.6);
    monsterGroup.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(0.3, 3.8, 0.6);
    monsterGroup.add(rightEye);

    // Bright eye lights (more intense glow)
    const eyeLight = new THREE.PointLight(0xff0000, 5, 20);
    eyeLight.position.set(0, 3.8, 0.8);
    monsterGroup.add(eyeLight);

    // Add a red aura around monster
    const auraGeometry = new THREE.SphereGeometry(2, 16, 16);
    const auraMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        transparent: true,
        opacity: 0.1,
        side: THREE.BackSide
    });
    const aura = new THREE.Mesh(auraGeometry, auraMaterial);
    aura.position.y = 2;
    monsterGroup.add(aura);

    // Position monster behind player when they enter corridor
    monsterGroup.position.set(0, 0, -20); // Behind player when they're at -60
    monsterGroup.visible = false; // Hidden initially

    scene.add(monsterGroup);
    monster = monsterGroup;

    // Monster AI properties
    monster.userData.speed = 6;
    monster.userData.chaseSpeed = 12;
    monster.userData.isChasing = false;
    monster.userData.targetPosition = null;
    monster.userData.aura = aura; // Store aura reference

    console.log('Monster created');
}

// ========================================
// Monster AI
// ========================================

function updateMonster(delta) {
    if (!monster || !monsterActive || currentState !== GameState.PLAYING) return;

    const playerPos = camera.position;
    const monsterPos = monster.position;

    // Calculate direction to player
    const direction = new THREE.Vector3();
    direction.subVectors(playerPos, monsterPos);
    direction.y = 0; // Keep monster on ground
    direction.normalize();

    // Move monster towards player
    const speed = monster.userData.chaseSpeed;
    monster.position.x += direction.x * speed * delta;
    monster.position.z += direction.z * speed * delta;

    // Make monster look at player
    monster.lookAt(playerPos.x, monster.position.y, playerPos.z);

    // Check if monster caught the player
    const distance = monsterPos.distanceTo(playerPos);
    if (distance < 2.5) {
        // Player caught!
        gameOver();
    }

    // Animate monster
    monster.position.y = Math.sin(Date.now() * 0.005) * 0.2;

    // Pulsing aura effect
    if (monster.userData.aura) {
        const pulse = Math.sin(Date.now() * 0.003) * 0.1 + 0.15;
        monster.userData.aura.material.opacity = pulse;
        monster.userData.aura.scale.setScalar(1 + Math.sin(Date.now() * 0.002) * 0.2);
    }

    // Visual indicator when monster is close
    if (distance < 10 && distance > 2.5) {
        // Add red vignette effect as monster gets closer
        document.body.style.boxShadow = `inset 0 0 ${100 - distance * 5}px rgba(255, 0, 0, ${0.3 - distance * 0.02})`;
    } else {
        document.body.style.boxShadow = 'none';
    }
}

function activateMonster() {
    if (!monster || monsterActive) return;

    console.log('Monster activated!');

    // Make monster visible with dramatic effect
    monster.visible = true;
    monsterActive = true;

    // Flash the screen red briefly
    const flash = document.createElement('div');
    flash.style.position = 'fixed';
    flash.style.top = '0';
    flash.style.left = '0';
    flash.style.width = '100%';
    flash.style.height = '100%';
    flash.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
    flash.style.pointerEvents = 'none';
    flash.style.zIndex = '100';
    flash.style.transition = 'opacity 0.5s';
    document.body.appendChild(flash);

    setTimeout(() => {
        flash.style.opacity = '0';
        setTimeout(() => flash.remove(), 500);
    }, 100);

    // Show dramatic warning
    showHint('⚠️ 괴물이 깨어났습니다! 빨리 도망치세요! ⚠️', 3000);

    // Make all lights flicker dramatically
    lights.forEach(light => {
        const originalIntensity = light.userData.originalIntensity;
        light.intensity = 0;
        setTimeout(() => { light.intensity = originalIntensity; }, 100);
        setTimeout(() => { light.intensity = 0; }, 200);
        setTimeout(() => { light.intensity = originalIntensity; }, 300);
        setTimeout(() => { light.intensity = originalIntensity * 0.7; }, 400);
    });

    console.log('Monster position:', monster.position);
    console.log('Monster visible:', monster.visible);
}

// ========================================
// Mobile Detection
// ========================================

function detectMobile() {
    isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
        || (window.innerWidth <= 768);

    if (isMobile) {
        console.log('Mobile device detected');
        document.getElementById('mobile-controls').style.display = 'block';
    }
}

// ========================================
// Mobile Controls Setup
// ========================================

function setupMobileControls() {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickStick = document.getElementById('joystick-stick');
    const interactBtn = document.getElementById('mobile-interact-btn');
    const runBtn = document.getElementById('mobile-run-btn');

    // Joystick controls
    joystickContainer.addEventListener('touchstart', (e) => {
        e.preventDefault();
        joystickActive = true;
        updateJoystick(e.touches[0]);
    });

    joystickContainer.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (joystickActive) {
            updateJoystick(e.touches[0]);
        }
    });

    joystickContainer.addEventListener('touchend', (e) => {
        e.preventDefault();
        joystickActive = false;
        joystickDirection = { x: 0, y: 0 };
        joystickStick.style.left = '50%';
        joystickStick.style.top = '50%';

        // Reset movement
        controls.moveForward = false;
        controls.moveBackward = false;
        controls.moveLeft = false;
        controls.moveRight = false;
    });

    // Touch camera rotation (on main screen)
    let cameraTouch = null;
    document.addEventListener('touchstart', (e) => {
        // Ignore if touching joystick or buttons
        if (e.target.closest('#mobile-controls')) return;

        if (e.touches.length === 1) {
            cameraTouch = e.touches[0].identifier;
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
        }
    });

    document.addEventListener('touchmove', (e) => {
        if (cameraTouch === null) return;

        for (let touch of e.touches) {
            if (touch.identifier === cameraTouch) {
                const deltaX = touch.clientX - touchStartX;
                const deltaY = touch.clientY - touchStartY;

                const sensitivity = 0.003;
                yaw -= deltaX * sensitivity;
                pitch -= deltaY * sensitivity;

                pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

                camera.rotation.order = 'YXZ';
                camera.rotation.y = yaw;
                camera.rotation.x = pitch;

                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                break;
            }
        }
    });

    document.addEventListener('touchend', (e) => {
        for (let touch of e.changedTouches) {
            if (touch.identifier === cameraTouch) {
                cameraTouch = null;
                break;
            }
        }
    });

    // Interact button
    interactBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        checkInteraction();
    });

    // Run button
    runBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        controls.isRunning = true;
    });

    runBtn.addEventListener('touchend', (e) => {
        e.preventDefault();
        controls.isRunning = false;
    });
}

function updateJoystick(touch) {
    const joystickContainer = document.getElementById('joystick-container');
    const joystickStick = document.getElementById('joystick-stick');
    const rect = joystickContainer.getBoundingClientRect();

    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    let deltaX = touch.clientX - centerX;
    let deltaY = touch.clientY - centerY;

    const maxDistance = 45;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    if (distance > maxDistance) {
        deltaX = (deltaX / distance) * maxDistance;
        deltaY = (deltaY / distance) * maxDistance;
    }

    joystickStick.style.left = `calc(50% + ${deltaX}px)`;
    joystickStick.style.top = `calc(50% + ${deltaY}px)`;

    joystickDirection.x = -deltaX / maxDistance;  // Negated to fix reversed left/right
    joystickDirection.y = deltaY / maxDistance;

    // Update movement controls
    const threshold = 0.2;
    controls.moveForward = joystickDirection.y < -threshold;
    controls.moveBackward = joystickDirection.y > threshold;
    controls.moveLeft = joystickDirection.x < -threshold;
    controls.moveRight = joystickDirection.x > threshold;
}

// ========================================
// Event Listeners
// ========================================

function setupEventListeners() {
    // Start button
    document.getElementById('start-button').addEventListener('click', startGame);

    // Retry button
    document.getElementById('retry-button').addEventListener('click', restartGame);

    // Play again button
    document.getElementById('play-again-button').addEventListener('click', restartGame);

    // Keyboard controls
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Mouse controls
    document.addEventListener('mousemove', onMouseMove);

    // Pointer lock (for FPS controls)
    document.addEventListener('click', () => {
        if (currentState === GameState.PLAYING && !isPointerLocked) {
            renderer.domElement.requestPointerLock();
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isPointerLocked = document.pointerLockElement === renderer.domElement;
    });

    // Window resize
    window.addEventListener('resize', onWindowResize);

    console.log('Event listeners setup');
}

function startGame() {
    console.log('Starting game...');
    document.getElementById('instructions').style.display = 'none';
    document.getElementById('game-ui').style.display = 'block';
    currentState = GameState.PLAYING;

    // Show hint
    showHint('낯선 방에서 깨어났습니다. 탈출구를 찾으세요...', 5000);

    // Request pointer lock
    renderer.domElement.requestPointerLock();
}

function restartGame() {
    // Reset player position
    camera.position.set(0, 1.6, 0);
    yaw = 0;
    pitch = 0;

    // Hide game over/victory screens
    document.getElementById('game-over').style.display = 'none';
    document.getElementById('victory').style.display = 'none';

    // Show game UI
    document.getElementById('game-ui').style.display = 'block';

    // Reset game state
    currentState = GameState.PLAYING;
    currentPhase = GamePhase.ROOM1;
    playerInCorridor = false;

    // Reset monster
    if (monster) {
        monster.visible = false;
        monster.position.set(0, 0, -20);
        monsterActive = false;
    }

    // Clear any red vignette
    document.body.style.boxShadow = 'none';

    // Reset first door set opacity
    doors.forEach(door => {
        if (door.material.transparent) {
            door.material.transparent = false;
            door.material.opacity = 1;
        }
    });

    // Reset second door set opacity
    secondDoors.forEach(door => {
        if (door.material.transparent) {
            door.material.transparent = false;
            door.material.opacity = 1;
        }
    });

    // Request pointer lock
    renderer.domElement.requestPointerLock();
}

function onKeyDown(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            controls.moveForward = true;
            break;
        case 'KeyS':
        case 'ArrowDown':
            controls.moveBackward = true;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            controls.moveLeft = true;
            break;
        case 'KeyD':
        case 'ArrowRight':
            controls.moveRight = true;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            controls.isRunning = true;
            break;
        case 'KeyE':
            checkInteraction();
            break;
    }
}

function onKeyUp(event) {
    switch (event.code) {
        case 'KeyW':
        case 'ArrowUp':
            controls.moveForward = false;
            break;
        case 'KeyS':
        case 'ArrowDown':
            controls.moveBackward = false;
            break;
        case 'KeyA':
        case 'ArrowLeft':
            controls.moveLeft = false;
            break;
        case 'KeyD':
        case 'ArrowRight':
            controls.moveRight = false;
            break;
        case 'ShiftLeft':
        case 'ShiftRight':
            controls.isRunning = false;
            break;
    }
}

function onMouseMove(event) {
    if (!isPointerLocked || currentState !== GameState.PLAYING) return;

    const sensitivity = 0.002;

    yaw -= event.movementX * sensitivity;
    pitch -= event.movementY * sensitivity;

    // Limit pitch (prevent looking too far up/down)
    pitch = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, pitch));

    // Apply rotation to camera
    camera.rotation.order = 'YXZ';
    camera.rotation.y = yaw;
    camera.rotation.x = pitch;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// ========================================
// Interaction System
// ========================================

function checkInteraction() {
    if (currentState !== GameState.PLAYING) return;

    // Cast ray from camera
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(interactableObjects);

    if (intersects.length > 0) {
        const object = intersects[0].object;

        if (object.userData.type === 'door') {
            handleDoorInteraction(object);
        }
    }
}

function handleDoorInteraction(door) {
    console.log('Door interaction:', door.userData.doorIndex, 'Set:', door.userData.doorSet);

    if (door.userData.doorSet === 1) {
        // === FIRST SET OF DOORS ===
        if (door.userData.isCorrect) {
            // Correct door - Enter corridor
            showHint('정답입니다! 문이 열립니다... 복도로 들어갑니다.', 3000);

            // Make door transparent/open
            door.material.transparent = true;
            door.material.opacity = 0.3;

            // Move player into corridor
            setTimeout(() => {
                camera.position.set(0, 1.6, -15);
                currentPhase = GamePhase.CORRIDOR;
                playerInCorridor = true;
                showHint('조심히 앞으로 나아가세요...', 3000);
            }, 1000);

        } else {
            // Wrong door - Instant Game Over
            showHint('잘못된 선택입니다!', 2000);
            setTimeout(() => {
                gameOver();
            }, 2000);
        }

    } else if (door.userData.doorSet === 2) {
        // === SECOND SET OF DOORS (at end of corridor) ===
        if (door.userData.isCorrect) {
            // Correct door - Victory!
            showHint('정답입니다! 탈출 성공!', 3000);

            // Make door transparent/open
            door.material.transparent = true;
            door.material.opacity = 0.3;

            // Move player through door
            setTimeout(() => {
                currentPhase = GamePhase.ROOM2;
                camera.position.set(0, 1.6, -121);
            }, 500);

            setTimeout(() => {
                victory();
            }, 2000);
        } else {
            // Wrong door - Game Over
            showHint('잘못된 선택입니다... 다시 시도하세요.', 2000);
            setTimeout(() => {
                gameOver();
            }, 2000);
        }
    }
}

function updateInteractionPrompt() {
    if (currentState !== GameState.PLAYING) return;

    // Cast ray from camera
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);

    const intersects = raycaster.intersectObjects(interactableObjects);
    const promptElement = document.getElementById('interaction-prompt');
    const mobileInteractBtn = document.getElementById('mobile-interact-btn');

    if (intersects.length > 0 && intersects[0].distance < 3) {
        const object = intersects[0].object;

        if (object.userData.type === 'door') {
            if (isMobile) {
                // Show mobile interact button
                mobileInteractBtn.classList.add('visible');
                promptElement.textContent = `문 ${object.userData.doorIndex + 1}`;
            } else {
                promptElement.textContent = `문 ${object.userData.doorIndex + 1} - [E] 열기`;
            }
            promptElement.style.display = 'block';
        }
    } else {
        promptElement.style.display = 'none';
        if (isMobile) {
            mobileInteractBtn.classList.remove('visible');
        }
    }
}

// ========================================
// UI Functions
// ========================================

function showHint(text, duration = 3000) {
    const hintElement = document.getElementById('hint-display');
    hintElement.textContent = text;
    hintElement.style.display = 'block';

    setTimeout(() => {
        hintElement.style.display = 'none';
    }, duration);
}

function gameOver() {
    currentState = GameState.GAME_OVER;
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('game-over').style.display = 'flex';
    document.exitPointerLock();
}

function victory() {
    currentState = GameState.VICTORY;
    document.getElementById('game-ui').style.display = 'none';
    document.getElementById('victory').style.display = 'flex';
    document.exitPointerLock();
}

// ========================================
// Player Movement
// ========================================

function updatePlayerMovement(delta) {
    if (currentState !== GameState.PLAYING) return;

    const speed = controls.isRunning ? runSpeed : playerSpeed;

    velocity.x -= velocity.x * 10.0 * delta;
    velocity.z -= velocity.z * 10.0 * delta;

    direction.z = Number(controls.moveForward) - Number(controls.moveBackward);
    direction.x = Number(controls.moveRight) - Number(controls.moveLeft);
    direction.normalize();

    if (controls.moveForward || controls.moveBackward) {
        velocity.z -= direction.z * speed * delta;
    }

    if (controls.moveLeft || controls.moveRight) {
        velocity.x -= direction.x * speed * delta;
    }

    // Get camera direction
    const cameraDirection = new THREE.Vector3();
    camera.getWorldDirection(cameraDirection);
    cameraDirection.y = 0;
    cameraDirection.normalize();

    // Get right vector
    const right = new THREE.Vector3();
    right.crossVectors(camera.up, cameraDirection).normalize();

    // Calculate movement
    const moveVector = new THREE.Vector3();
    moveVector.addScaledVector(cameraDirection, -velocity.z);
    moveVector.addScaledVector(right, -velocity.x);

    // Apply movement with collision detection
    const newPosition = camera.position.clone().add(moveVector);

    // Boundary check based on current phase
    let canMove = false;

    if (currentPhase === GamePhase.ROOM1) {
        // Stay within first room
        const boundary = 9;
        if (Math.abs(newPosition.x) < boundary && newPosition.z > -9 && newPosition.z < boundary) {
            canMove = true;
        }
    } else if (currentPhase === GamePhase.CORRIDOR) {
        // In corridor - allow movement along corridor
        const corridorWidth = 3.5;
        // Can't go past -118 (before doors) unless a door is opened
        if (Math.abs(newPosition.x) < corridorWidth && newPosition.z < 0 && newPosition.z > -118) {
            canMove = true;
        }
    } else if (currentPhase === GamePhase.ROOM2) {
        // In end room (wider area)
        const endRoomWidth = 7;
        if (Math.abs(newPosition.x) < endRoomWidth && newPosition.z < -110 && newPosition.z > -122) {
            canMove = true;
        }
    }

    if (canMove) {
        camera.position.copy(newPosition);
    }

    // Check if player reached middle of corridor
    if (currentPhase === GamePhase.CORRIDOR && !monsterActive && camera.position.z < -60) {
        activateMonster();
    }
}

// ========================================
// Lighting Effects
// ========================================

function updateLighting(delta) {
    // Flickering effect
    lights.forEach(light => {
        if (light.userData.flickerTime !== undefined) {
            light.userData.flickerTime += delta;

            // Random flicker every few seconds
            if (Math.random() < 0.01) {
                light.intensity = light.userData.originalIntensity * (0.5 + Math.random() * 0.5);
            } else if (light.userData.flickerTime > 0.1) {
                light.intensity = light.userData.originalIntensity;
                light.userData.flickerTime = 0;
            }
        }
    });
}

// ========================================
// Animation Loop
// ========================================

function animate() {
    requestAnimationFrame(animate);

    const delta = clock.getDelta();

    if (currentState === GameState.PLAYING) {
        updatePlayerMovement(delta);
        updateLighting(delta);
        updateInteractionPrompt();
        updateMonster(delta);
    }

    renderer.render(scene, camera);
}

// ========================================
// Start the game
// ========================================

init();
animate();
