import AOE_ICONS from './aoeIcons.json';

export const ICON_MAP = {
  'DarkAgeIconDE': '/techs/DarkAgeIconDE.png',
  'FeudalAgeIconDE': '/techs/FeudalAgeIconDE.png',
  'CastleAgeIconDE': '/techs/CastleAgeIconDE.png',
  'ImperialAgeIconDE': '/techs/ImperialAgeIconDE.png',
  'LoomDE': '/techs/LoomDE.png',
  'Forging_aoe2de': '/techs/Forging_aoe2de.png',
  'ChainMailArmorDE': '/techs/ChainMailArmorDE.png',
  'ScaleMailArmorDE': '/techs/ScaleMailArmorDE.png',
  'SquiresDE': '/techs/SquiresDE.png',
  'BowSawDE': '/techs/BowSawDE.png',
  'DoubleBitAxe_aoe2DE': '/techs/DoubleBitAxe_aoe2DE.png',
  'HeavyPlowDE': '/techs/HeavyPlowDE.png',
  'HorseCollarDE': '/techs/HorseCollarDE.png',
  'FletchingDE': '/techs/FletchingDE.png',
  'BodkinArrowDE': '/techs/BodkinArrowDE.png',
  'WheelbarrowDE': '/techs/WheelbarrowDE.png',
  'Gold_mining_aoe2de': '/aoe/tech/Gold_Mining.png',
  
  'ManAtArmsUpgDE': '/techs/ManAtArmsUpgDE.png',
  'LongSwordsmanUpgDE': '/techs/LongSwordmanUpgDE.png', 
  'Crossbowman_aoe2DE': '/techs/CrossbowmanDE.png',

  'MilitiaDE': '/units/MilitiaDE.png',
  'Manatarms': '/units/Manatarms_aoe2DE.png',
  'Longswordsman_aoe2DE': '/units/Longswordsman_aoe2DE.png',
  'Archer_aoe2DE': '/units/Archer_aoe2DE.png',
  'Tradecart_aoe2DE': '/units/Tradecart_aoe2DE.png',
  'Scoutcavalry_aoe2DE': '/units/Scoutcavalry_aoe2DE.png',
  'FishingShipDE': '/units/FishingShipDE.png',
  'Hulk_AoE2': '/units/Hulk_AoE2.png',
  'MuleCartDE': '/units/MuleCartDE.png',
  'House_aoe2DE': '/buildings/House_aoe2DE.png',
  'Mill_aoe2de': '/buildings/Mill_aoe2de.png',
  'Lumber_camp_aoe2de': '/buildings/Lumber_camp_aoe2de.png',
  'Barracks_aoe2DE': '/buildings/Barracks_aoe2DE.png',
  'Blacksmith_aoe2de': '/buildings/Blacksmith_aoe2de.png',
  'Archery_range_aoe2DE': '/buildings/Archery_range_aoe2DE.png',
  'Market_aoe2DE': '/buildings/Market_aoe2DE.png',
  'Monastery_aoe2DE': '/buildings/Monastery_aoe2DE.png',
  'Siege_workshop_aoe2DE': '/buildings/Siege_workshop_aoe2DE.png',
  'Stable_aoe2de': '/buildings/Stable_aoe2DE.png',
  'Dock_aoe2DE': '/buildings/Dock_aoe2DE.png',
  'Mining_camp_aoe2de': '/aoe/building/Mining_Camp.png',
  'Town_center_aoe2de': '/buildings/Town_center_aoe2de.png',
  'University_aoe2de': '/buildings/University_AoE2_DE.png',
  'CastleDE': '/buildings/Castle_aoe2DE.png',
  'LightCavalryDE': '/units/Lightcavalry_aoe2DE.png',
  'FarmDE': '/buildings/Farm_Icon_AoE.png',
};

// Accepts our own keys (ICON_MAP) or any unit, tech or building name as it appears in the game (e.g. "Bodkin Arrow")
export const iconPath = (name) => {
  if (!name || typeof name !== 'string') return null;
  return ICON_MAP[name] || AOE_ICONS[name] || null;
};
