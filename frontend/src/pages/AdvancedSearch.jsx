import { useState, useEffect, useMemo, useRef } from 'react'

// LISTADO DE ICONOS (inyectado para el emparejamiento inteligente)
const ICON_LIST = [
  "/units/Abraha_Elephant_AoE2DE.png", "/units/Alpaca_AoE2DE.png", "/units/Amazonarcher_aoe2DE.png", "/units/Amazonwarrior_aoe2DE.png", "/units/AoE2DE_Armored_Elephant_icon.png", "/units/AoE2DE_Elite_Shrivamsha_Rider.png", "/units/AoE2DE_Siege_Elephant_icon.png", "/units/AoE2DE_ingame_camel_icon.png", "/units/AoE2_CompositeBowman.png", "/units/AoE2_DE_Legionary_new_icon.png", "/units/AoE2_DE_Pagan_Priest_icon.png", "/units/AoE2_DE_alfred_icon.png", "/units/AoE2_DE_donkey.png", "/units/AoE2_DE_priest_icon.png", "/units/AoE2_Dromon.png", "/units/AoE2_Monaspa.png", "/units/AoE2_Qizilbash_icon.png", "/units/AoE2_Savar.png", "/units/AoE2_WarriorPriest.png", "/units/Aoe2-icon--houfnice.png", "/units/Aoe2-icon--obuch.png", "/units/Aoe2-icon-coustillier.png", "/units/Aoe2-icon-flemish-militia.png", "/units/Aoe2-icon-hussite-wagon.png", "/units/Aoe2-icon-serjeant.png", "/units/Aoe2-icon-winged-hussar.png", "/units/Aoe2-infantry-2-pikeman.png", "/units/Aoe2_Imam.png", "/units/Aoe2_heavycamelriderDE.png", "/units/Aoe2de_Chakram.png", "/units/Aoe2de_DOI_elephant_archer_icon.png", "/units/Aoe2de_Ghulam.png", "/units/Aoe2de_Thirisadai.png", "/units/Aoe2de_Urumi.png", "/units/Aoe2de_camel_scout.png", "/units/Aoe2de_ratha_melee.png", "/units/Aoe2de_ratha_ranged.png", "/units/Aoe2de_roman_unique_centurion_icon.png", "/units/Aoe2de_shrivamsha_rider.png", "/units/Arabian_Wolf_icon_AoE2DE.png", "/units/Arambaiicon-DE.png", "/units/Arariboia_AoE2DE.png", "/units/Arbalester_aoe2DE.png", "/units/Archer_aoe2DE.png", "/units/Arctic_Fox_AoE2DE.png", "/units/Arctic_Hare_AoE2DE.png", "/units/Arctic_Wolf_icon_AoE2DE.png", "/units/Argali_AoE2DE.png", "/units/Bactrian_camel_icon.png", "/units/Badneighboricon.png", "/units/BallistaElephantIcon-TTK.png", "/units/Ballistaelephanticon-DE.png", "/units/Battering_ram_aoe2DE.png", "/units/Battle_elephant_aoe2DE.png", "/units/BerserkIcon-DE.png", "/units/Black_Panther_AoE2DE.png", "/units/Blackwood_Archer_AoE2.png", "/units/Bolas_Rider_AoE2.png", "/units/Bombard_cannon_aoe2DE.png", "/units/BoyarIcon-DE.png", "/units/Caiman_AoE2DE.png", "/units/CamelArcherIcon-DE.png", "/units/Camelrider_aoe2DE.png", "/units/Cannon_galleon_aoe2DE.png", "/units/Cannon_galleon_hi_res.png", "/units/Canoe_aoe2DE.png", "/units/Cao_Cao_SPC_AoE2DE.png", "/units/Cao_Cao_unit_AoE2DE.png", "/units/Capped_ram_aoe2DE.png", "/units/Capybara_AoE2DE.png", "/units/CaravelIcon-DE.png", "/units/Carrack_AoE2.png", "/units/Cataphract_AoE2_LotW.png", "/units/Cataphract_render.png", "/units/Catapult_Galleon_AoE2.png", "/units/Cavalier_aoe2DE.png", "/units/Cavalry_archer_render_model.png", "/units/Cavalryarcher_aoe2DE.png", "/units/Centurion_aoe2DE.png", "/units/Champi_Runner_AoE2.png", "/units/Champi_Scout_AoE2.png", "/units/Champi_Warrior_AoE2.png", "/units/Champion_aoe2DE.png", "/units/Champion_render.png", "/units/Chicken_icon_AoE2DE.png", "/units/Chu_ko_nu_render.png", "/units/ChukoNuIcon-DE.png", "/units/CobracarDE.png", "/units/Condor_AoE2DE.png", "/units/CondottieroIcon-DE.png", "/units/ConquistadorIcon-DE.png", "/units/CrocodileIcon.jpg", "/units/Crossbowman_aoe2DE.png", "/units/Crusader_knight_aoe2de.jpg", "/units/Cuman_chief_aoe2de.png", "/units/Cunhambebe_AoE2DE.png", "/units/Demoraft_aoe2DE.png", "/units/Demoship_aoe2DE.png", "/units/Dong_Zhuo_AoE2DE.png", "/units/Donkey_caravan_aoe2DE.png", "/units/Dragonship_aoe2DE.png", "/units/Eaglescout_aoe2DE.png", "/units/Eaglewarrior_aoe2DE.png", "/units/Eastern_swordsman_aoe2DE.png", "/units/ElephantArcherIcon-DE.png", "/units/EliteArambaiIcon-DE.png", "/units/EliteBerserkIcon-DE.png", "/units/EliteBoyarIcon-DE.png", "/units/EliteCamelArcherIcon-DE.png", "/units/EliteCaravelIcon-DE.png", "/units/EliteCenturionIcon-DE.png", "/units/EliteChakramThrowerIcon-DE.png", "/units/EliteChuKoNuIcon-DE.png", "/units/EliteCompositeBowmanIcon-DE.png", "/units/EliteConquistadorIcon-DE.png", "/units/EliteCoustillierIcon-DE.png", "/units/EliteDismountedKonnikIcon-DE.png", "/units/EliteEaglewarrior_aoe2DE.png", "/units/EliteGbetoIcon-DE.png", "/units/EliteGenitourIcon-DE.png", "/units/EliteGenoeseCrossbowmanIcon-DE.png", "/units/EliteGhulamIcon-DE.png", "/units/EliteHuskarlIcon-DE.png", "/units/EliteHussiteWagonIcon-DE.png", "/units/EliteJaguarWarriorIcon-DE.png", "/units/EliteJanissaryIcon-DE.png", "/units/EliteKamayukIcon-DE.png", "/units/EliteKarambitWarriorIcon-DE.png", "/units/EliteKeshikIcon-DE.png", "/units/EliteKipchakIcon-DE.png", "/units/EliteKonnikIcon-DE.png", "/units/EliteLeitisIcon-DE.png", "/units/EliteLongboatIcon-DE.png", "/units/EliteMagyarHuszarIcon-DE.png", "/units/EliteMamelukeIcon-DE.png", "/units/EliteMangudaiIcon-DE.png", "/units/EliteMonaspaIcon-DE.png", "/units/EliteObuchIcon-DE.png", "/units/EliteOrganGunIcon-DE.png", "/units/ElitePlumedArcherIcon-DE.png", "/units/EliteRathaMeleeIcon-DE.png", "/units/EliteRathaRangedIcon-DE.png", "/units/EliteRattanArcherIcon-DE.png", "/units/EliteSamuraiIcon-DE.png", "/units/EliteSerjeantIcon-DE.png", "/units/EliteTarkanIcon-DE.png", "/units/EliteTeutonicKnightIcon-DE.png", "/units/EliteThrowingAxemanIcon-DE.png", "/units/EliteTurtleShipIcon-DE.png", "/units/EliteUrumiIcon-DE.png", "/units/EliteWarElephantIcon-DE.png", "/units/EliteWarWagonIcon-DE.png", "/units/EliteWoadRaiderIcon-DE.png", "/units/Elite_Arambai_AoE2DE_TTK.png", "/units/Elite_Blackwood_Archer_AoE2.png", "/units/Elite_Bolas_Rider_AoE2.png", "/units/Elite_Camel_Archer_AoE2DE_TTK.png", "/units/Elite_Cataphract_AoE2_TTK.png", "/units/Elite_Champi_Warrior_AoE2.png", "/units/Elite_Fire_Archer_AoE2.png", "/units/Elite_Fire_Lancer_AoE2.png", "/units/Elite_Guecha_Warrior_AoE2.png", "/units/Elite_Ibirapema_Warrior_AoE2.png", "/units/Elite_Iron_Pagoda_AoE2.png", "/units/Elite_Kona_AoE2.png", "/units/Elite_Liao_Dao_AoE2.png", "/units/Elite_Temple_Guard_AoE2.png", "/units/Elite_Tiger_Cavalry_AoE2.png", "/units/Elite_War_Dog_AoE2DE.png", "/units/Elite_White_Feather_Guard_AoE2.png", "/units/Elite_battle_elephant_aoe2DE.png", "/units/Elite_cannon_galleon_aoe2de.png", "/units/Elite_skirmisher_aoe2DE.png", "/units/Elitesteppelancericon.png", "/units/Emperor_in_a_Litter_AoE2DE.png", "/units/Fastfireship_aoe2DE.png", "/units/Fire_Archer_AoE2.png", "/units/Fire_Lancer_AoE2.png", "/units/Fire_galley_aoe2DE.png", "/units/Fireship_aoe2DE.png", "/units/FishingShipDE.png", "/units/Flamethrower_aoe2de.png", "/units/Flaming_camel_icon.png", "/units/Flamingo_AoE2DE.png", "/units/Galleon_aoe2DE.png", "/units/Galley_aoe2DE.png", "/units/Galvarino_AoE2DE.png", "/units/GbetoIcon-DE.png", "/units/GenitourIcon-DE.png", "/units/Genitour_hi_res.png", "/units/GenoeseCrossbowmanIcon-DE.png", "/units/Grenadier_AoE2.png", "/units/Guacolda_AoE2DE.png", "/units/Guan_Yu_AoE2DE.png", "/units/Guanaco_AoE2DE.png", "/units/Guecha_Warrior_AoE2.png", "/units/Guglielmo_AoE2DE.png", "/units/Halberdier_aoe2DE.png", "/units/Hand_cannoneer_aoe2DE.png", "/units/Hare_AoE2DE.png", "/units/HeavyPikeman_aoe2DE.png", "/units/Heavy_Hei_Guang_Cavalry_AoE2.png", "/units/Heavy_Rocket_Cart_AoE2.png", "/units/Heavy_swordsman_aoe2DE.png", "/units/Heavycavalryarcher_aoe2de.png", "/units/Heavydemoship_aoe2de.png", "/units/Heavyscorpion_aoe2DE.png", "/units/Heavyswordsmanicon.png", "/units/Hei_Guang_Cavalry_AoE2.png", "/units/Hero_2_Icon.png", "/units/Hero_Trebuchet_(Packed)_icon_AoE2.png", "/units/Horse-icon-aoe2.jpg", "/units/Horse_aoe2DE.png", "/units/Hulk_AoE2.png", "/units/HuskarlIcon-DE.png", "/units/Huskarl_render.png", "/units/Hussar_aoe2DE.png", "/units/Hussar_render.png", "/units/Ibirapema_Warrior_AoE2.png", "/units/Iconcow.png", "/units/Iconpig.png", "/units/ImperialCamelRiderIcon-DE.png", "/units/Imperialskirmishericon-DE.png", "/units/Iron_Pagoda_AoE2.png", "/units/Iroquois_warrior_aoe2DE.png", "/units/Itzcoatl_AoE2DE.png", "/units/JANNI.jpg", "/units/Jaguar-icon-aoe2.jpg", "/units/JaguarWarriorIcon-DE.png", "/units/JanissaryIcon-DE.png", "/units/Javelina_AoE2DE.png", "/units/Jayanegara_AOE2DE.png", "/units/Jayaviravarman_aoe2DE.png", "/units/Jian_Swordsman_strong_AoE2.png", "/units/Jian_Swordsman_weak_AoE2.png", "/units/Junk_aoe2DE.png", "/units/KamayukIcon-DE.png", "/units/KamayukIcon-TTK.png", "/units/Kamayuk_Reskin_Icon.png", "/units/Karambitwarrioricon-DE.png", "/units/Karambitwarrioricon-DE_red.png", "/units/Keshikicon.png", "/units/Khan_aoe2de.png", "/units/KingA.png", "/units/KingB.png", "/units/KingC.png", "/units/KingD.png", "/units/KingE.png", "/units/King_an_aoe2DE.png", "/units/King_eu_aoe2DE.png", "/units/Kipchakicon.png", "/units/Knight_aoe2DE.png", "/units/Kona_AoE2.png", "/units/Konnikicon.png", "/units/KotyanKhan_aoe2DE.png", "/units/Lautaro_AoE2DE.png", "/units/LeTrien_aoe2DE.png", "/units/Leitisicon.png", "/units/Lelai_aoe2DE.png", "/units/Liao_Dao_AoE2.png", "/units/Light_cavalry_render.png", "/units/Lightcavalry_aoe2DE.png", "/units/LionIcon.jpg", "/units/Liu_Bei_SPC_AoE2DE.png", "/units/Liu_Bei_unit_AoE2DE.png", "/units/Liu_Biao_AoE2DE.png", "/units/LlamaII_icon.png", "/units/LongboatIcon-DE.png", "/units/LongbowmanIcon-DE.png", "/units/Longbowman_AoE2_TTK.png", "/units/Longbowman_render.png", "/units/Longswordsman_aoe2DE.png", "/units/Longswordsman_render.png", "/units/Lou_Chuan_AoE2.png", "/units/Lu_Bu_AoE2DE.png", "/units/Luu_Nhan_Chu_aoe2DE.png", "/units/MagyarHuszarIcon-DE.png", "/units/Magyar_huszar_hi_res.png", "/units/MaleVillDE.jpg", "/units/MamelukeIcon-DE.png", "/units/Manatarms_aoe2DE.png", "/units/MangonelIcon.png", "/units/Mangonel_aoe2DE.png", "/units/MangudaiIcon-DE.png", "/units/Merchant_euro_aoe2DE.png", "/units/Miklos_Toldi_AoE2DE.png", "/units/MilitiaDE.png", "/units/Militia_render.png", "/units/MissionaryIcon-DE.png", "/units/Monaspa_icon.PNG", "/units/Monk_AN_AoE2DE.png", "/units/Monk_Catholic_icon_AoE2DE.png", "/units/Monk_Hindu_icon_AoE2DE.png", "/units/Monk_Orthodox_icon_AoE2DE.png", "/units/Monk_Tengri_icon_AoE2DE.png", "/units/Monk_aoe2DE.png", "/units/Monk_render.png", "/units/Monkey_aoe2DE.png", "/units/Mouflon_icon_AOE2DE.png", "/units/Mounted_Trebuchet_AoE2.png", "/units/Mustafa_Pasha_AoE2DE.png", "/units/New_Boyar.png", "/units/Ninja_aoe2DE.png", "/units/Norsewarrior_aoe2DE.png", "/units/Obuch_AoE2_DotD.png", "/units/OnagerIcon.png", "/units/Onager_aoe2DE.png", "/units/OrganGunIcon-DE.png", "/units/Ox_cart_aoe2DE.png", "/units/Ox_wagon1_aoe2DE.png", "/units/Pacanchique_AoE2DE.png", "/units/Paladin_aoe2DE.png", "/units/Peacock_icon_Chronicles.png", "/units/Penguin_aoe2DE.png", "/units/Petard_aoe2DE.png", "/units/Photonman_aoe2DE.png", "/units/PlumedArcherIcon-DE.png", "/units/Polar_Bear_icon_AoE2DE.png", "/units/Queen_aoe2DE.png", "/units/Rattanarchericon-DE.png", "/units/Red_Fox_AoE2DE.png", "/units/Rhea_AoE2DE.png", "/units/Rocket_Cart_AoE2.png", "/units/Royal_janissary_aoe2de.png", "/units/Saboteur_aoe2DE.png", "/units/SamuraiIcon-DE.png", "/units/Scorpion_aoe2DE.png", "/units/Scoutcavalry_aoe2DE.png", "/units/Shah_aoe2DE.png", "/units/Sharkatzoricon.png", "/units/Ship_icon_AoK_alpha.png", "/units/Shotelwarrioricon-DE.png", "/units/Siege_onager_aoe2DE.png", "/units/Siege_ram_aoe2DE.png", "/units/Siegetower_aoe2DE.png", "/units/Siegetowericon.png", "/units/Skirmisher_aoe2DE.png", "/units/SlingerIcon-DE.png", "/units/Snake_AoE2DE.png", "/units/Sogdian_Cataphract_icon_AoE2DE.png", "/units/Spearman_aoe2DE.png", "/units/Spy_icon_AoE2DE.png", "/units/Steppelancericon.png", "/units/Stormy_Dog_icon.png", "/units/Su_Dingfang_AoE2DE.png", "/units/Sun_Ce_AoE2DE.png", "/units/Sun_Jian_SPC_AoE2DE.png", "/units/Sun_Jian_unit_AoE2DE.png", "/units/Sun_Quan_AoE2DE.png", "/units/Tapir_AoE2DE.png", "/units/TarkanIcon-DE.png", "/units/Temple_Guard_AoE2.png", "/units/Terter.jpg", "/units/TeutonicKnightIcon-DE.png", "/units/ThrowingAxemanIcon-DE.png", "/units/Tiger_Cavalry_AoE2.png", "/units/Town_center_packed_aoe2de.png", "/units/Traction_Trebuchet_AoE2.png", "/units/Trade_cog_aoe2DE.png", "/units/Tradecart_aoe2DE.png", "/units/Transportship_aoe2DE.png", "/units/Trebuchet_aoe2DE.png", "/units/TurtleShipIcon-DE.png", "/units/Twohanded_aoe2DE.png", "/units/VMDL_DE_icon.png", "/units/WarElephantIcon-DE.png", "/units/WarWagonIcon-DE.png", "/units/War_Chariot_AoE2.png", "/units/War_Dog_AoE2DE.png", "/units/War_Hulk_AoE2.png", "/units/War_galley_aoe2DE.png", "/units/Whale_AoE2DE.png", "/units/White_Feather_Guard_AoE2.png", "/units/White_Tiger_Yan_AoE2DE.png", "/units/Wild_Chicken_AoE2.png", "/units/WoadRaiderIcon-DE.png", "/units/Xianbei_Raider_AoE2.png", "/units/Xolotlicon.png", "/units/Yu_Ji_AoE2DE.png", "/units/Yuan_Shao_AoE2DE.png", "/units/Zhang_Fei_AoE2DE.png", "/units/Zhang_Jue_AoE2DE.png", "/units/Zhao_Yun_AoE2DE.png", "/units/Zhou_Yu_AoE2DE.png", "/units/Zhuge_Liang_AoE2DE.png",
  "/techs/AoE2DE_Legionary_upgrade.png", "/techs/AoE2_Gambesons.png", "/techs/AoEDE_Long_Swordsman.png", "/techs/Arbalester_aoe2DE.png", "/techs/ArchitectureDE.png", "/techs/ArrowSlitsDE.png", "/techs/ArsonDE.png", "/techs/AtonementDE.png", "/techs/BallisticsDE.png", "/techs/BankingDE.png", "/techs/BlastFurnaceDE.png", "/techs/BlockPrintingDE.png", "/techs/BloodlinesDE.png", "/techs/BodkinArrowDE.png", "/techs/BombardTower_aoe2DE.png", "/techs/Bombardcannonresearch.png", "/techs/BowSawDE.png", "/techs/BracerDE.png", "/techs/CannongalleonresearchDE.webp", "/techs/CaravanDE.png", "/techs/CareeningDE.png", "/techs/Careening_AoE2TLC.png", "/techs/Cartography_aoe2de.png", "/techs/Carvel_Hull_AoE2DE.png", "/techs/Carvel_Hull_AoE2DE_beta.png", "/techs/CastleAgeIconDE.png", "/techs/Cavalier_Group.png", "/techs/ChainBardingDE.png", "/techs/ChainMailArmorDE.png", "/techs/ChampiRunnerUpgrade_AoE2DE.png", "/techs/ChampiWarriorUpgrade_AoE2DE.png", "/techs/ChampionUpgDE.png", "/techs/ChemistryDE.png", "/techs/Clinker_Construction_AoE2DE.png", "/techs/Clinker_Construction_AoE2DE_beta.png", "/techs/CoinageDE.png", "/techs/ConscriptionDE.png", "/techs/CropRotationDE.png", "/techs/DE_Champion_Club_Warrior.png", "/techs/DarkAgeIconDE.png", "/techs/DemolitionShipUpgrade_AoE2DE.png", "/techs/Devotion_icon_AoE2DE.png", "/techs/Domestication_AoE2.png", "/techs/DoubleBitAxe_aoe2DE.png", "/techs/Dragon_Ship_upgrade_AoE2.png", "/techs/DryDockDE.png", "/techs/Dry_Dock_AoE2TLC.png", "/techs/EliteChampiWarriorUpgrade_AoE2DE.png", "/techs/EliteWarDogUpgrade_AoE2DE.png", "/techs/Elite_Fire_Lancer_upgrade_AoE2.png", "/techs/Eliteskirmisherresearch.png", "/techs/English_Crossbowmen.png", "/techs/FaithDE.png", "/techs/Favor_Blue_Team_Komnenos.png", "/techs/Favor_Green_Team_Komnenos.png", "/techs/Favor_Red_Team_Komnenos.png", "/techs/Favor_White_Team_Komnenos.png", "/techs/FervorDE.png", "/techs/FeudalAgeIconDE.png", "/techs/Fishing_Lines_AoE2DE.png", "/techs/FletchingDE.png", "/techs/Forging_aoe2de.png", "/techs/GillnetsDE.png", "/techs/GoldMiningDE.png", "/techs/GoldShaftMiningDE.png", "/techs/GuildsDE.png", "/techs/HRE_Heavy_Maces.png", "/techs/Halberdier's_History_portrait.png", "/techs/Handcannon.png", "/techs/HandcartDE.png", "/techs/HeatedShotDE.png", "/techs/HeavyPlowDE.png", "/techs/Heavy_Hei_Guang_Cavalry_upgrade_AoE2.png", "/techs/Heavy_Rocket_Cart_upgrade_AoE2.png", "/techs/Heavy_Warships_AoE2DE.png", "/techs/HerbalDE.png", "/techs/HeresyDE.png", "/techs/HoardingsDE.png", "/techs/HorseCollarDE.png", "/techs/HusbandryDE.png", "/techs/IlluminationDE.png", "/techs/ImperialAgeIconDE.png", "/techs/Incendiaries_AoE2DE.png", "/techs/IronCastingDE.png", "/techs/Iroquois_Home_City_2_(7_Mantlets_inf).png", "/techs/LeatherArcherArmorDE.png", "/techs/LightCavalryUnits.png", "/techs/LongSwordmanUpgDE.png", "/techs/LoomDE.png", "/techs/ManAtArmsUpgDE.png", "/techs/Masonry_aoe2de.png", "/techs/Medium_Warships_AoE2DE.png", "/techs/MurderHolesDE.png", "/techs/PaddedArcherArmorDE.png", "/techs/Paladin_icon_AoK_pre-alpha.png", "/techs/ParthianTacticsDE.png", "/techs/Pastoralism_AoE2.png", "/techs/Pikeman_sprite_aoe2.png", "/techs/PlateBardingArmorDE.png", "/techs/PlateMailArmorDE.png", "/techs/RedemptionDE.png", "/techs/RingArcherArmorDE.png", "/techs/SanctityDE.png", "/techs/SapperDE.png", "/techs/ScaleBardingArmorDE.png", "/techs/ScaleMailArmorDE.png", "/techs/ShipwrightDE.png", "/techs/SiegeEngineersDE.png", "/techs/Siphons_AoE2DE.png", "/techs/SpiesDE.png", "/techs/SquiresDE.png", "/techs/StoneMiningDE.png", "/techs/StoneShaftMiningDE.png", "/techs/Suplliesicon.png", "/techs/TheocracyDE.png", "/techs/ThumbRingDE.png", "/techs/TownPatrolDE.png", "/techs/TownWatchDE.png", "/techs/TrackingDE.png", "/techs/Transhumance_AoE2.png", "/techs/TreadmillCraneDE.png", "/techs/TwoHandedSwordsmanUpgDE.png", "/techs/TwoManSawDE.png", "/techs/UniqueTechCastle-DE.png", "/techs/UniqueTechImperialDE.png", "/techs/WarGalleyDE.png", "/techs/WheelbarrowDE.png", "/techs/Winged-hussar_upgrade.png"
];

// Función para encontrar el icono que mejor coincida
const getIconPath = (name, type) => {
  if (!name) return null;
  const cleanName = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  const folder = type === 'unit' ? '/units/' : '/techs/';
  
  const match = ICON_LIST.find(path => {
    if (!path.startsWith(folder)) return false;
    const fileName = path.split('/').pop().toLowerCase().replace(/[^a-z0-9]/g, '');
    return fileName.includes(cleanName) || cleanName.includes(fileName.replace('aoe2de', '').replace('icon', '').replace('png', ''));
  });
  
  return match || null;
};

function AdvancedSearch() {
  const [techtree, setTechtree] = useState(null)
  const [filters, setFilters] = useState([])
  
  // Estados para el Autocompletado
  const [pendingType, setPendingType] = useState('unit')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedItem, setSelectedItem] = useState(null)
  const [isDropdownOpen, setIsDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)

  const [pendingNot, setPendingNot] = useState(false)
  const [pendingOperator, setPendingOperator] = useState('AND')

  useEffect(() => {
    fetch('/techtree.json')
      .then(res => res.json())
      .then(data => setTechtree(data))
      .catch(() => console.error('Could not load techtree.json'))
  }, [])

  // Cierra el dropdown si haces clic fuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // Build sorted option lists (Excluyendo unidades y tecnologías únicas)
  // Build sorted option lists (Excluyendo únicas y universales)
  const unitOptions = useMemo(() => {
    if (!techtree) return []
    
    const totalCivs = Object.keys(techtree.civs).length;
    const counts = {}
    
    Object.values(techtree.civs).forEach(civ => {
      civ.units.forEach(id => counts[id] = (counts[id] || 0) + 1)
    })

    return Object.entries(techtree.units)
      .filter(([id]) => counts[id] > 1 && counts[id] < totalCivs) // Ni únicas ni de todas
      .map(([id, name]) => ({ id: parseInt(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [techtree])

  const techOptions = useMemo(() => {
    if (!techtree) return []
    
    const totalCivs = Object.keys(techtree.civs).length;
    const counts = {}
    
    Object.values(techtree.civs).forEach(civ => {
      civ.techs.forEach(id => counts[id] = (counts[id] || 0) + 1)
    })

    return Object.entries(techtree.techs)
      .filter(([id]) => counts[id] > 1 && counts[id] < totalCivs) // Ni únicas ni de todas
      .map(([id, name]) => ({ id: parseInt(id), name }))
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [techtree])

  // Filtrado de opciones mientras se escribe
  const filteredOptions = useMemo(() => {
    const options = pendingType === 'unit' ? unitOptions : techOptions;
    if (!searchTerm) return options;
    return options.filter(opt => opt.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [searchTerm, pendingType, unitOptions, techOptions])

  // Compute results
  const results = useMemo(() => {
    if (!techtree || filters.length === 0) return null

    const civNames = Object.keys(techtree.civs)
    
    return civNames.filter(civ => {
      const civData = techtree.civs[civ]
      let result = null

      for (let i = 0; i < filters.length; i++) {
        const f = filters[i]
        const list = f.type === 'unit' ? civData.units : civData.techs
        let match = list.includes(f.id)
        if (f.not) match = !match

        if (i === 0) {
          result = match
        } else {
          if (f.operator === 'AND') result = result && match
          else result = result || match
        }
      }
      return result
    }).sort()
  }, [techtree, filters])

  const handleSelectOption = (opt) => {
    setSelectedItem(opt)
    setSearchTerm(opt.name)
    setIsDropdownOpen(false)
  }

  const addFilter = () => {
    if (!selectedItem) return
    
    setFilters(prev => [...prev, {
      type: pendingType,
      id: selectedItem.id,
      name: selectedItem.name,
      not: pendingNot,
      operator: prev.length === 0 ? null : pendingOperator
    }])
    
    // Resetear campos tras añadir
    setSelectedItem(null)
    setSearchTerm('')
    setPendingNot(false)
  }

  const removeFilter = (index) => {
    setFilters(prev => {
      const newFilters = prev.filter((_, i) => i !== index)
      if (newFilters.length > 0 && newFilters[0].operator !== null) {
        newFilters[0] = { ...newFilters[0], operator: null }
      }
      return newFilters
    })
  }

  const clearAll = () => setFilters([])

  if (!techtree) {
    return <div style={{ padding: '3rem', color: '#888', textAlign: 'center' }}>Loading tech tree data...</div>
  }

  return (
    <div style={{ backgroundColor: '#161920', color: '#e0e0e0', minHeight: '100vh', padding: '0', fontFamily: 'Segoe UI, sans-serif' }}>
      <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 2rem' }}>

        {/* HEADER */}
        <div style={{ textAlign: 'center', marginBottom: '24px' }}>
          <h1 style={{ color: '#ffd700', fontSize: '20px', fontWeight: 'bold', margin: '0 0 4px 0', letterSpacing: '2px', textTransform: 'uppercase' }}>Advanced Search</h1>
          <p style={{ color: '#888', fontSize: '12px', margin: 0 }}>Find civilizations by unit and technology availability</p>
        </div>

        {/* FILTER BUILDER */}
        <div style={{ backgroundColor: '#1a1c23', borderRadius: '6px', border: '1px solid #333', padding: '16px', marginBottom: '16px' }}>
          <h3 style={{ color: '#ffd700', fontSize: '11px', margin: '0 0 12px 0', textTransform: 'uppercase', letterSpacing: '1px', borderBottom: '1px solid #444', paddingBottom: '6px' }}>Build Your Query</h3>

          {/* Active filters */}
          {filters.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
              {filters.map((f, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#161920', padding: '6px 10px', borderRadius: '4px', border: '1px solid #2a2d36' }}>
                  {f.operator && (
                    <span style={{ fontSize: '10px', fontWeight: 'bold', color: f.operator === 'AND' ? '#4caf50' : '#66b2ff', backgroundColor: f.operator === 'AND' ? '#4caf5022' : '#66b2ff22', padding: '2px 6px', borderRadius: '3px', minWidth: '30px', textAlign: 'center' }}>{f.operator}</span>
                  )}
                  {!f.operator && <span style={{ minWidth: '30px' }}></span>}
                  
                  {/* ICONO DEL FILTRO ACTIVO */}
                  {getIconPath(f.name, f.type) && (
                    <img src={getIconPath(f.name, f.type)} alt={f.name} style={{ width: '20px', height: '20px', objectFit: 'contain' }} />
                  )}

                  <span style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', minWidth: '35px' }}>{f.type}</span>
                  {f.not && <span style={{ fontSize: '9px', fontWeight: 'bold', color: '#ff4444', backgroundColor: '#ff444422', padding: '1px 4px', borderRadius: '2px' }}>NOT</span>}
                  <span style={{ fontSize: '12px', fontWeight: 'bold', color: f.type === 'unit' ? '#66b2ff' : '#4caf50' }}>{f.name}</span>
                  <span style={{ flex: 1 }}></span>
                  <span onClick={() => removeFilter(i)} style={{ color: '#ff4444', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold', padding: '0 4px' }}>✗</span>
                </div>
              ))}
            </div>
          )}

          {/* New filter row */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
            {/* Operator (only if not first filter) */}
            {filters.length > 0 && (
              <select value={pendingOperator} onChange={e => setPendingOperator(e.target.value)} style={{ backgroundColor: '#1e212b', color: pendingOperator === 'AND' ? '#4caf50' : '#66b2ff', border: '1px solid #444', padding: '6px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', width: '65px' }}>
                <option value="AND">AND</option>
                <option value="OR">OR</option>
              </select>
            )}

            {/* NOT toggle */}
            <button onClick={() => setPendingNot(!pendingNot)} style={{ backgroundColor: pendingNot ? '#ff444433' : '#1e212b', color: pendingNot ? '#ff4444' : '#555', border: `1px solid ${pendingNot ? '#ff4444' : '#444'}`, padding: '6px 10px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer', transition: 'all 0.2s' }}>NOT</button>

            {/* Type selector */}
            <select value={pendingType} onChange={e => { 
                setPendingType(e.target.value); 
                setSelectedItem(null); 
                setSearchTerm(''); 
              }} 
              style={{ backgroundColor: '#1e212b', color: pendingType === 'unit' ? '#66b2ff' : '#4caf50', border: `1px solid ${pendingType === 'unit' ? '#66b2ff55' : '#4caf5055'}`, padding: '6px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', outline: 'none', cursor: 'pointer', width: '80px' }}>
              <option value="unit">Unit</option>
              <option value="tech">Tech</option>
            </select>

            {/* Autocomplete Input */}
            <div ref={dropdownRef} style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
              <div style={{ display: 'flex', alignItems: 'center', backgroundColor: '#1e212b', border: '1px solid #444', borderRadius: '4px' }}>
                
                {/* ICONO SELECCIONADO AL LADO DEL INPUT */}
                {selectedItem && getIconPath(selectedItem.name, pendingType) && (
                  <img src={getIconPath(selectedItem.name, pendingType)} alt="icon" style={{ width: '20px', height: '20px', marginLeft: '8px' }} />
                )}

                <input 
                  type="text" 
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value)
                    setSelectedItem(null) // Resetea la selección si edita el texto
                    setIsDropdownOpen(true)
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={`Search ${pendingType}...`}
                  style={{ backgroundColor: 'transparent', color: '#e0e0e0', border: 'none', padding: '8px', fontSize: '12px', outline: 'none', width: '100%' }}
                />
              </div>

              {/* Lista desplegable */}
              {isDropdownOpen && filteredOptions.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: '#1a1c23', border: '1px solid #444', borderRadius: '4px', marginTop: '4px', maxHeight: '250px', overflowY: 'auto', zIndex: 100, boxShadow: '0 4px 12px rgba(0,0,0,0.5)' }}>
                  {filteredOptions.map(opt => (
                    <div 
                      key={opt.id} 
                      onClick={() => handleSelectOption(opt)}
                      style={{ padding: '8px', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', borderBottom: '1px solid #2a2d36', color: '#e0e0e0', fontSize: '12px', transition: 'background 0.2s' }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2a2d36'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      {getIconPath(opt.name, pendingType) && (
                        <img src={getIconPath(opt.name, pendingType)} alt="icon" style={{ width: '20px', height: '20px' }} />
                      )}
                      {opt.name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add button */}
            <button onClick={addFilter} disabled={!selectedItem} style={{ backgroundColor: selectedItem ? '#ffd700' : '#333', color: selectedItem ? '#161920' : '#555', border: 'none', padding: '8px 16px', borderRadius: '4px', fontSize: '11px', fontWeight: 'bold', cursor: selectedItem ? 'pointer' : 'not-allowed', letterSpacing: '1px', transition: 'all 0.2s' }}>+ ADD</button>

            {/* Clear all */}
            {filters.length > 0 && (
              <button onClick={clearAll} style={{ backgroundColor: 'transparent', color: '#ff4444', border: '1px solid #ff444444', padding: '8px 12px', borderRadius: '4px', fontSize: '10px', fontWeight: 'bold', cursor: 'pointer' }}>CLEAR</button>
            )}
          </div>
        </div>

        {/* RESULTS */}
        {results !== null && (
          <div style={{ backgroundColor: '#1a1c23', borderRadius: '6px', border: '1px solid #333', padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #444', paddingBottom: '8px', marginBottom: '12px' }}>
              <h3 style={{ color: '#ffd700', fontSize: '11px', margin: 0, textTransform: 'uppercase', letterSpacing: '1px' }}>Results</h3>
              <span style={{ fontSize: '12px', color: results.length > 0 ? '#4caf50' : '#ff4444', fontWeight: 'bold' }}>
                {results.length} / {Object.keys(techtree.civs).length} civilizations
              </span>
            </div>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '20px', color: '#555', fontSize: '12px', fontStyle: 'italic' }}>No civilizations match all criteria.</div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
                {results.map(civ => (
                  <div key={civ} style={{ display: 'flex', alignItems: 'center', gap: '8px', backgroundColor: '#161920', padding: '8px 10px', borderRadius: '4px', border: '1px solid #2a2d36', transition: 'border-color 0.2s' }} onMouseEnter={e => e.currentTarget.style.borderColor = '#ffd70055'} onMouseLeave={e => e.currentTarget.style.borderColor = '#2a2d36'}>
                    <img src={`/civs/${civ.toLowerCase()}.png`} alt={civ} style={{ width: '28px', height: '28px', borderRadius: '3px', objectFit: 'cover' }} onError={e => e.target.style.display = 'none'} />
                    <span style={{ fontSize: '12px', fontWeight: 'bold', color: '#e0e0e0' }}>{civ}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Excluded civs */}
            {results.length > 0 && results.length < Object.keys(techtree.civs).length && (
              <div style={{ marginTop: '12px', paddingTop: '10px', borderTop: '1px solid #2a2d36' }}>
                <div style={{ fontSize: '10px', color: '#555', textTransform: 'uppercase', fontWeight: 'bold', letterSpacing: '1px', marginBottom: '6px' }}>Excluded</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                  {Object.keys(techtree.civs).filter(c => !results.includes(c)).sort().map(civ => (
                    <span key={civ} style={{ fontSize: '10px', color: '#555', padding: '2px 6px', backgroundColor: '#1e212b', borderRadius: '3px' }}>{civ}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  )
}

export default AdvancedSearch