export const defs = (() => {

  const _CHARACTER_MODELS: any = {
    parrot: {
        base: 'Parrot.glb',
        path: './resources/nature/',
        anchors: {
          rightHand: 'Head',
        },
        nameOffset: 11,
        attack: {
            timing: 0.35,
            cooldown: 2.0,
            type: 'melee',
            range: 2,
        },
        scale: 0.2,
        inventory: {
            'inventory-equip-1': 'weapon.hammer1',
        },
        stats: {
            health: 20,
            maxHealth: 200,
            strength: 2,
        },
        name: 'Parrot',
    },
    beetle: {
        base: 'black_ox_beetle.glb',
        path: './resources/bugs/beetle/',
        anchors: {
          rightHand: 'Mandible1_L_54',
        },
        nameOffset: 11,
        attack: {
            timing: 0.35,
            cooldown: 2.0,
            type: 'melee',
            range: 2,
        },
        scale: 0.7,
        inventory: {
            'inventory-equip-1': 'weapon.hammer1',
        },
        stats: {
            health: 20,
            maxHealth: 200,
            strength: 2,
        },
        name: 'beetle',
    },
    spider: {
        base: 'spider_small.glb',
        path: './resources/bugs/spider/',
        anchors: {
          rightHand: 'Body',
        },
        nameOffset: 11,
        attack: {
            timing: 0.35,
            cooldown: 2.0,
            type: 'melee',
            range: 2,
        },
        scale: 0.2,
        inventory: {
            'inventory-equip-1': 'weapon.hammer1',
        },
        stats: {
            health: 20,
            maxHealth: 200,
            strength: 2,
        },
        name: 'spider',
    },
    ladybug: {
        base: 'ladybug.glb',
        path: './resources/bugs/ladybug/',
        anchors: {
          rightHand: 'Body',
        },
        nameOffset: 11,
        attack: {
            timing: 0.35,
            cooldown: 2.0,
            type: 'melee',
            range: 2,
        },
        scale: 0.2,
        inventory: {
            'inventory-equip-1': 'weapon.hammer1',
        },
        stats: {
            health: 20,
            maxHealth: 200,
            strength: 2,
        },
        name: 'ladybug',
    },
    bee: {
        base: 'bee-v1.glb',
        path: './resources/bugs/bee/',
        anchors: {
          rightHand: 'Body',
        },
        nameOffset: 11,
        attack: {
            timing: 0.35,
            cooldown: 2.0,
            type: 'melee',
            range: 2,
        },
        scale: 0.2,
        inventory: {
            'inventory-equip-1': 'weapon.hammer1',
        },
        stats: {
            health: 20,
            maxHealth: 200,
            strength: 2,
        },
        name: 'bee',
    },
    scorpion: {
        base: 'scorpion.glb',
        path: './resources/bugs/scorpion/',
        anchors: {
          rightHand: 'Body',
        },
        nameOffset: 11,
        attack: {
            timing: 0.35,
            cooldown: 2.0,
            type: 'melee',
            range: 2,
        },
        scale: 1.0,
        inventory: {
            'inventory-equip-1': 'weapon.hammer1',
        },
        stats: {
            health: 20,
            maxHealth: 200,
            strength: 2,
        },
        name: 'scorpion',
    }
  };

  const _WEAPONS_DATA: any = {
      'weapon.axe1':
      {
          type: 'weapon',
          damage: 3,
          renderParams: {
            name: 'Axe',
            scale: 0.125,
            icon: 'war-axe-64.png',
          },
      },
      'weapon.sword1':
      {
          type: 'weapon',
          damage: 3,
          renderParams: {
            name: 'Sword',
            scale: 0.125,
            icon: 'pointy-sword-64.png',
          },
      },
      'weapon.hammer1':
      {
          type: 'weapon',
          damage: 3,
          renderParams: {
            name: 'Hammer_Small',
            scale: 0.005,
            icon: 'hammer-64.png',
          },
      },
  };

  return {
    CHARACTER_MODELS: _CHARACTER_MODELS,
    WEAPONS_DATA: _WEAPONS_DATA,
  };
})();