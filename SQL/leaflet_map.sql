-- phpMyAdmin SQL Dump
-- version 5.2.1
-- https://www.phpmyadmin.net/
--
-- Host: 127.0.0.1
-- Generation Time: Dec 09, 2025 at 02:04 PM
-- Server version: 10.4.32-MariaDB
-- PHP Version: 8.2.12

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `leaflet_map`
--

-- --------------------------------------------------------

--
-- Table structure for table `audit_log`
--

CREATE TABLE `audit_log` (
  `id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `target_type` enum('marker','polyline','polygon') DEFAULT NULL,
  `target_id` int(11) DEFAULT NULL,
  `timestamp` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `markers`
--

CREATE TABLE `markers` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `category` varchar(50) NOT NULL,
  `description` text DEFAULT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `icon_type` varchar(50) DEFAULT 'round',
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `markers`
--

INSERT INTO `markers` (`id`, `name`, `category`, `description`, `lat`, `lng`, `icon_type`, `image`, `created_at`) VALUES
(9, 'ISATU', 'School', '', 10.71602072253594, 122.5668239593506, 'round', '68de21eec7be1.png', '2025-10-02 02:01:08'),
(11, 'Love dance 2025', 'Events', '', 10.704989669852694, 122.55083799362184, 'round', '68dde4ea542c7.jpg', '2025-10-02 02:35:22'),
(14, 'park', 'location', 'asdasd', 10.707612166393549, 122.5566148525142, 'round', '68de1eb561b43.jpg', '2025-10-02 06:41:57'),
(15, 'lapuz', 'location', 'asdasd', 10.715058962574451, 122.57266519672089, 'round', '68de20dcb71ac.jpg', '2025-10-02 06:51:08'),
(17, 'Jaro Plaza', 'location', 'hi', 10.724407257781161, 122.55731329582468, 'round', '68de3c013d1da.jpg', '2025-10-02 08:46:57'),
(18, 'Jaro Plaza', 'location', 'hi', 10.724415690946774, 122.5573198299607, 'square', '68de3c28a0154.jpg', '2025-10-02 08:47:36'),
(19, 'Jaro Plaza', 'location', '', 10.723930784235666, 122.55742789378895, 'square', '68de3c58bab2e.jpg', '2025-10-02 08:48:24'),
(20, 'Jaro Plaza', 'Food', 'asd', 10.72431027651048, 122.55755665937127, 'round', '68de3c79ddbd0.jpg', '2025-10-02 08:48:57'),
(21, 'ISATU', 'Events', 'hi', 10.715168596914452, 122.56615971478332, 'square', '68de3cbd22839.jpg', '2025-10-02 08:50:05'),
(23, 'Manduriao Church', 'Events', 'hifg', 10.717766076386381, 122.53626848269585, 'square', '68de3d3b64082.jpg', '2025-10-02 08:52:11'),
(25, 'dinagyang', 'Events', '', 10.71762270958977, 122.55849838256837, 'round', '68de425449454.jpg', '2025-10-02 09:13:56'),
(27, 'Golf', 'Events', '', 10.711677144584362, 122.53749132156373, 'square', '691a1956f3ddd.png', '2025-11-16 18:35:02'),
(28, 'Plazuel De Iloilo', 'Events', '', 10.711930149728511, 122.55085945129396, 'round', '69232a7d5e512.jpg', '2025-11-23 15:38:37'),
(29, 'Ateneo De Iloilo', 'Shops', '', 10.70623748287619, 122.54831028010814, 'round', '6926998569468.png', '2025-11-26 06:09:09'),
(30, 'jonel', 'Souvenirs', '', 10.712330740774528, 122.56473398221718, 'round', '6926a0ce39002.jpg', '2025-11-26 06:40:14'),
(31, 'calle real night market', 'Events', 'baligya ka balut', 10.70138808972729, 122.56904697431311, 'round', '6926aab349f6f.jpg', '2025-11-26 07:22:27');

-- --------------------------------------------------------

--
-- Table structure for table `polygons`
--

CREATE TABLE `polygons` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `coordinates` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `color` varchar(20) DEFAULT 'green'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `polygons`
--

INSERT INTO `polygons` (`id`, `name`, `description`, `coordinates`, `created_at`, `color`) VALUES
(8, 'perimeter', 'diangayng', '[{\"lat\":10.719646705079986,\"lng\":122.5503444671631},{\"lat\":10.723230830552893,\"lng\":122.55944252014162},{\"lat\":10.715683034546343,\"lng\":122.56236076354982},{\"lat\":10.712689163892906,\"lng\":122.55502223968507}]', '2025-10-02 09:14:32', '#008066');

-- --------------------------------------------------------

--
-- Table structure for table `polylines`
--

CREATE TABLE `polylines` (
  `id` int(11) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` text DEFAULT NULL,
  `coordinates` text NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `color` varchar(20) DEFAULT 'blue'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `polylines`
--

INSERT INTO `polylines` (`id`, `name`, `description`, `coordinates`, `created_at`, `color`) VALUES
(7, 'Iloilo city', 'parameter of iloilo city', '[{\"lat\":10.681521314394885,\"lng\":122.49461889266969},{\"lat\":10.685888529865267,\"lng\":122.49687194824219},{\"lat\":10.69204893957186,\"lng\":122.49835252761842},{\"lat\":10.694833741275746,\"lng\":122.49867439270021},{\"lat\":10.694579031864373,\"lng\":122.50022470951082},{\"lat\":10.693703509105912,\"lng\":122.50214517116548},{\"lat\":10.693371231735016,\"lng\":122.5031751394272},{\"lat\":10.693344860499515,\"lng\":122.50415682792665},{\"lat\":10.693524184855695,\"lng\":122.50501513481142},{\"lat\":10.693840639343387,\"lng\":122.50550329685213},{\"lat\":10.693967221046053,\"lng\":122.5055891275406},{\"lat\":10.69406215728838,\"lng\":122.5056964159012},{\"lat\":10.694167641967239,\"lng\":122.50588417053224},{\"lat\":10.694426079275457,\"lng\":122.50660300254823},{\"lat\":10.694410256589459,\"lng\":122.50689268112184},{\"lat\":10.694262578146859,\"lng\":122.50712335109712},{\"lat\":10.694077979992544,\"lng\":122.50728428363801},{\"lat\":10.693719331828792,\"lng\":122.5074076652527},{\"lat\":10.693365957488082,\"lng\":122.5078046321869},{\"lat\":10.692479882704687,\"lng\":122.50840544700624},{\"lat\":10.69150414259867,\"lng\":122.50940322875978},{\"lat\":10.691261525652862,\"lng\":122.51009523868562},{\"lat\":10.691150765678326,\"lng\":122.5106853246689},{\"lat\":10.691113845677833,\"lng\":122.51182794570924},{\"lat\":10.691145234605813,\"lng\":122.512144446373},{\"lat\":10.691187428887362,\"lng\":122.51236975193025},{\"lat\":10.691324560261872,\"lng\":122.51255214214326},{\"lat\":10.691509160091258,\"lng\":122.51261651515962},{\"lat\":10.691641017043496,\"lng\":122.51271843910219},{\"lat\":10.691751776839094,\"lng\":122.512503862381},{\"lat\":10.692674773563693,\"lng\":122.5117313861847},{\"lat\":10.694309789441215,\"lng\":122.5109910964966},{\"lat\":10.694610420433916,\"lng\":122.5109374523163},{\"lat\":10.694847760480881,\"lng\":122.51105010509492},{\"lat\":10.69501126129412,\"lng\":122.51147389411928},{\"lat\":10.695079826125049,\"lng\":122.51204788684846},{\"lat\":10.695064003473135,\"lng\":122.51232683658601},{\"lat\":10.695116745642977,\"lng\":122.51268625259401},{\"lat\":10.695575602133776,\"lng\":122.51358211040498},{\"lat\":10.69586568346528,\"lng\":122.5137484073639},{\"lat\":10.69599753852425,\"lng\":122.51369476318361},{\"lat\":10.696081925731937,\"lng\":122.51361429691316},{\"lat\":10.69616103871779,\"lng\":122.51346945762636},{\"lat\":10.696240151683059,\"lng\":122.51327097415925},{\"lat\":10.69628234525607,\"lng\":122.51198887825014},{\"lat\":10.696385252379764,\"lng\":122.51169919967653},{\"lat\":10.696559300747428,\"lng\":122.5114792585373},{\"lat\":10.697529750420946,\"lng\":122.51094281673433},{\"lat\":10.697735443159454,\"lng\":122.51091063022615},{\"lat\":10.697941135758475,\"lng\":122.51092672348024},{\"lat\":10.698094086575008,\"lng\":122.51102328300477},{\"lat\":10.69817847319938,\"lng\":122.51131296157838},{\"lat\":10.698231214827702,\"lng\":122.51157045364381},{\"lat\":10.698173199036058,\"lng\":122.51188158988953},{\"lat\":10.697983329094878,\"lng\":122.51244485378267},{\"lat\":10.697540298769896,\"lng\":122.51424729824068},{\"lat\":10.697545572944252,\"lng\":122.51480519771577},{\"lat\":10.69769324978856,\"lng\":122.51500368118288},{\"lat\":10.697888394079722,\"lng\":122.51495003700258},{\"lat\":10.698046619088485,\"lng\":122.51473009586336},{\"lat\":10.698252311476471,\"lng\":122.51419365406038},{\"lat\":10.69836834301839,\"lng\":122.51375913619997},{\"lat\":10.698505471147067,\"lng\":122.51363575458528},{\"lat\":10.699748706739827,\"lng\":122.51312077045442},{\"lat\":10.699917479044242,\"lng\":122.51314222812654},{\"lat\":10.700033509949044,\"lng\":122.51327097415925},{\"lat\":10.700038784080041,\"lng\":122.5134962797165},{\"lat\":10.699801448095052,\"lng\":122.51422047615053},{\"lat\":10.699426984274314,\"lng\":122.51474618911745},{\"lat\":10.699163277080821,\"lng\":122.51501977443696},{\"lat\":10.699041971694806,\"lng\":122.51537919044495},{\"lat\":10.699284582418302,\"lng\":122.51585125923158},{\"lat\":10.699643224001845,\"lng\":122.51604974269868},{\"lat\":10.699864737709193,\"lng\":122.51611948013307},{\"lat\":10.70004933234173,\"lng\":122.51609265804292},{\"lat\":10.700170637324756,\"lng\":122.51595854759218},{\"lat\":10.700618937927965,\"lng\":122.51473546028139},{\"lat\":10.70079825798364,\"lng\":122.51458525657655},{\"lat\":10.70097757793329,\"lng\":122.51451551914217},{\"lat\":10.701520811251081,\"lng\":122.51453697681428},{\"lat\":10.702760223429443,\"lng\":122.5144135951996},{\"lat\":10.7032137942793,\"lng\":122.51429021358491},{\"lat\":10.70346167573602,\"lng\":122.51437604427339},{\"lat\":10.703614623767775,\"lng\":122.51463890075685},{\"lat\":10.70415785236019,\"lng\":122.51540064811708},{\"lat\":10.704848753338185,\"lng\":122.5160712003708},{\"lat\":10.704859301432514,\"lng\":122.51616775989534},{\"lat\":10.704563954652544,\"lng\":122.51661837100984},{\"lat\":10.70451121412584,\"lng\":122.51686513423921},{\"lat\":10.70453758439033,\"lng\":122.5170260667801},{\"lat\":10.704685257829142,\"lng\":122.5170797109604},{\"lat\":10.704796012861008,\"lng\":122.51703143119813},{\"lat\":10.704933138082508,\"lng\":122.51681149005891},{\"lat\":10.705133551756202,\"lng\":122.51646280288698},{\"lat\":10.705360335490232,\"lng\":122.51641452312471},{\"lat\":10.705697873756934,\"lng\":122.51650571823122},{\"lat\":10.705940479153893,\"lng\":122.51665592193605},{\"lat\":10.706077603857572,\"lng\":122.5168812274933},{\"lat\":10.706072329831674,\"lng\":122.5170421600342},{\"lat\":10.705972123321793,\"lng\":122.51711189746858},{\"lat\":10.705718969886103,\"lng\":122.51710116863252},{\"lat\":10.70556602291626,\"lng\":122.51706898212434},{\"lat\":10.705486912384305,\"lng\":122.51716017723085},{\"lat\":10.70550800852818,\"lng\":122.51733720302583},{\"lat\":10.705676777626278,\"lng\":122.51741766929628},{\"lat\":10.705898286924896,\"lng\":122.51747131347656},{\"lat\":10.706009041513493,\"lng\":122.51763224601747},{\"lat\":10.705972123321793,\"lng\":122.51776635646821},{\"lat\":10.705750614077145,\"lng\":122.51787364482881},{\"lat\":10.70543944605524,\"lng\":122.51792192459108},{\"lat\":10.705112455586246,\"lng\":122.51801848411561},{\"lat\":10.704956014971838,\"lng\":122.51820623874666},{\"lat\":10.704908548559631,\"lng\":122.51842617988588},{\"lat\":10.704998207332027,\"lng\":122.51860320568086},{\"lat\":10.705457048869714,\"lng\":122.51854419708253},{\"lat\":10.705694380426976,\"lng\":122.51842617988588},{\"lat\":10.706274523451167,\"lng\":122.51867294311525},{\"lat\":10.706749185099431,\"lng\":122.51918792724611},{\"lat\":10.706912679495025,\"lng\":122.51919329166414},{\"lat\":10.707107817851705,\"lng\":122.51870512962343},{\"lat\":10.707334600108355,\"lng\":122.51861929893495},{\"lat\":10.707476998182752,\"lng\":122.51862466335298},{\"lat\":10.707556108195181,\"lng\":122.518807053566},{\"lat\":10.707556108195181,\"lng\":122.51916110515596},{\"lat\":10.707709054160631,\"lng\":122.51924693584444},{\"lat\":10.70805713779417,\"lng\":122.51923620700838},{\"lat\":10.708220631484036,\"lng\":122.51932203769685},{\"lat\":10.70845796087688,\"lng\":122.5197458267212},{\"lat\":10.709006454762333,\"lng\":122.52031445503236},{\"lat\":10.709280701332686,\"lng\":122.52069532871248},{\"lat\":10.709444194362307,\"lng\":122.52114593982698},{\"lat\":10.709903029167652,\"lng\":122.52162873744966},{\"lat\":10.710119261421221,\"lng\":122.52233684062959},{\"lat\":10.710034878121126,\"lng\":122.52269625663757},{\"lat\":10.710182548880868,\"lng\":122.52290010452272},{\"lat\":10.710330219568615,\"lng\":122.52290546894075},{\"lat\":10.710430424637183,\"lng\":122.5228250026703},{\"lat\":10.710551725465285,\"lng\":122.52248704433443},{\"lat\":10.71059391704629,\"lng\":122.52214908599855},{\"lat\":10.710667752298914,\"lng\":122.52200424671175},{\"lat\":10.710836518523024,\"lng\":122.52200424671175},{\"lat\":10.710957819188511,\"lng\":122.52224564552309},{\"lat\":10.71100528465308,\"lng\":122.52243340015413},{\"lat\":10.710994736772713,\"lng\":122.52261042594911},{\"lat\":10.710841792465999,\"lng\":122.5227338075638},{\"lat\":10.7108206966935,\"lng\":122.52312004566194},{\"lat\":10.710952545247533,\"lng\":122.52324342727663},{\"lat\":10.711142407064532,\"lng\":122.52319514751436},{\"lat\":10.71133754269689,\"lng\":122.52306640148164},{\"lat\":10.711416651701235,\"lng\":122.52274453639986},{\"lat\":10.711411377768247,\"lng\":122.52245485782625},{\"lat\":10.711516856410388,\"lng\":122.52234220504762},{\"lat\":10.711690896089614,\"lng\":122.52236366271974},{\"lat\":10.711843839967589,\"lng\":122.52256214618684},{\"lat\":10.711859661743642,\"lng\":122.52286255359651},{\"lat\":10.712017879458921,\"lng\":122.52310395240785},{\"lat\":10.712054796913929,\"lng\":122.52349555492403},{\"lat\":10.712249931958482,\"lng\":122.52369940280916},{\"lat\":10.712508353851009,\"lng\":122.52367258071901},{\"lat\":10.712845884154087,\"lng\":122.52348482608797},{\"lat\":10.712967184014856,\"lng\":122.52351164817811},{\"lat\":10.713083209923196,\"lng\":122.52367794513704},{\"lat\":10.713109579441605,\"lng\":122.52405881881715},{\"lat\":10.713230879196768,\"lng\":122.52412855625154},{\"lat\":10.713594778170737,\"lng\":122.52405345439912},{\"lat\":10.71380573389746,\"lng\":122.52405881881715},{\"lat\":10.714132714983462,\"lng\":122.52415001392366},{\"lat\":10.714391135269402,\"lng\":122.52382814884187},{\"lat\":10.714396409150485,\"lng\":122.52359747886659},{\"lat\":10.714475517355824,\"lng\":122.52336680889131},{\"lat\":10.714728663473974,\"lng\":122.5232380628586},{\"lat\":10.714871058072443,\"lng\":122.52318978309633},{\"lat\":10.715008178733612,\"lng\":122.52301275730134},{\"lat\":10.715514469867648,\"lng\":122.52277135849},{\"lat\":10.715662137955622,\"lng\":122.52271234989168},{\"lat\":10.716258083435932,\"lng\":122.52266407012941},{\"lat\":10.716484858841566,\"lng\":122.52237975597383},{\"lat\":10.716774920159327,\"lng\":122.52183794975282},{\"lat\":10.717339220472152,\"lng\":122.52135515213014},{\"lat\":10.717790403081208,\"lng\":122.52108693122865},{\"lat\":10.71825449905474,\"lng\":122.52093672752382},{\"lat\":10.71950439035382,\"lng\":122.52110302448274},{\"lat\":10.720147792301352,\"lng\":122.52095818519592},{\"lat\":10.720269089236583,\"lng\":122.52072215080263},{\"lat\":10.72046949276217,\"lng\":122.52067387104036},{\"lat\":10.720717360097114,\"lng\":122.52079725265504},{\"lat\":10.720931924633108,\"lng\":122.52118349075319},{\"lat\":10.721079590078272,\"lng\":122.52124786376955},{\"lat\":10.721258898021963,\"lng\":122.52126395702363},{\"lat\":10.72141711082518,\"lng\":122.52119421958925},{\"lat\":10.721533133495004,\"lng\":122.5210601091385},{\"lat\":10.72158587105747,\"lng\":122.52072751522066},{\"lat\":10.722155436146593,\"lng\":122.52000868320467},{\"lat\":10.72240330210059,\"lng\":122.51983165740968},{\"lat\":10.722951770723839,\"lng\":122.51972436904909},{\"lat\":10.72314689874425,\"lng\":122.51957416534425},{\"lat\":10.723183814842052,\"lng\":122.5193864107132},{\"lat\":10.722909580865029,\"lng\":122.51912891864778},{\"lat\":10.722867391000353,\"lng\":122.5188982486725},{\"lat\":10.722999234307935,\"lng\":122.51854419708253},{\"lat\":10.723136351286898,\"lng\":122.51833498477936},{\"lat\":10.723563523015283,\"lng\":122.51838862895967},{\"lat\":10.723711187176189,\"lng\":122.51833498477936},{\"lat\":10.72385885126501,\"lng\":122.51838862895967},{\"lat\":10.723948504426655,\"lng\":122.51861929893495},{\"lat\":10.724133084381618,\"lng\":122.51859784126283},{\"lat\":10.72427547455567,\"lng\":122.5183403491974},{\"lat\":10.724449506899584,\"lng\":122.51818478107454},{\"lat\":10.724671002465227,\"lng\":122.51782536506653},{\"lat\":10.725106626537638,\"lng\":122.51773416996004},{\"lat\":10.72529647947715,\"lng\":122.51780390739442},{\"lat\":10.725776384987402,\"lng\":122.51769661903383},{\"lat\":10.725939869108238,\"lng\":122.51780390739442},{\"lat\":10.72631430014883,\"lng\":122.51788437366487},{\"lat\":10.726604352044772,\"lng\":122.51776635646821},{\"lat\":10.726799477709182,\"lng\":122.51753568649293},{\"lat\":10.72677838304882,\"lng\":122.51716554164888},{\"lat\":10.726952413952745,\"lng\":122.5170260667801},{\"lat\":10.727363759327558,\"lng\":122.51709043979646},{\"lat\":10.72771182036159,\"lng\":122.51699924468996},{\"lat\":10.728007144561149,\"lng\":122.51683294773103},{\"lat\":10.728624160261687,\"lng\":122.5167363882065},{\"lat\":10.728951125336264,\"lng\":122.51670956611635},{\"lat\":10.729082965992129,\"lng\":122.5164842605591},{\"lat\":10.729251721947742,\"lng\":122.51639306545259},{\"lat\":10.729499582086822,\"lng\":122.51650035381319},{\"lat\":10.729742168409166,\"lng\":122.51675784587862},{\"lat\":10.730016396191385,\"lng\":122.51674175262453},{\"lat\":10.73048047341009,\"lng\":122.51638770103456},{\"lat\":10.730585945405902,\"lng\":122.51631259918214},{\"lat\":10.731334795518201,\"lng\":122.51611948013307},{\"lat\":10.731487729467974,\"lng\":122.51584053039552},{\"lat\":10.732111153290136,\"lng\":122.51571714878084},{\"lat\":10.732337916812519,\"lng\":122.51575469970705},{\"lat\":10.73247502955749,\"lng\":122.51591026782991},{\"lat\":10.732612142240262,\"lng\":122.51593172550203},{\"lat\":10.7330445741401,\"lng\":122.51550793647768},{\"lat\":10.73325551630578,\"lng\":122.5154221057892},{\"lat\":10.733523717998635,\"lng\":122.51549184322359},{\"lat\":10.734077439991799,\"lng\":122.5158727169037},{\"lat\":10.735142692782704,\"lng\":122.51607656478882},{\"lat\":10.735443283237531,\"lng\":122.5159800052643},{\"lat\":10.73580715549334,\"lng\":122.51563668251039},{\"lat\":10.736007548722505,\"lng\":122.51535236835481},{\"lat\":10.73611301878973,\"lng\":122.51510024070741},{\"lat\":10.736645642066916,\"lng\":122.51467645168306},{\"lat\":10.736854518776873,\"lng\":122.51461744308473},{\"lat\":10.737023270393765,\"lng\":122.51476228237154},{\"lat\":10.737192021916423,\"lng\":122.51470327377321},{\"lat\":10.73725530371313,\"lng\":122.5145584344864},{\"lat\":10.737234209782361,\"lng\":122.51437604427339},{\"lat\":10.737540071634259,\"lng\":122.51397371292114},{\"lat\":10.737861753592721,\"lng\":122.51363039016724},{\"lat\":10.738109606671363,\"lng\":122.5137108564377},{\"lat\":10.738257263727952,\"lng\":122.51370012760164},{\"lat\":10.738394373787301,\"lng\":122.51356065273286},{\"lat\":10.738636952970637,\"lng\":122.51353383064271},{\"lat\":10.738805703592016,\"lng\":122.51342117786409},{\"lat\":10.738890078867355,\"lng\":122.51348018646242},{\"lat\":10.739027188639513,\"lng\":122.5133514404297},{\"lat\":10.739180118696579,\"lng\":122.51340508461},{\"lat\":10.739391056579322,\"lng\":122.5132977962494},{\"lat\":10.739522892681219,\"lng\":122.51309394836427},{\"lat\":10.74155316138459,\"lng\":122.51726210117342},{\"lat\":10.738029373167928,\"lng\":122.52772808074953},{\"lat\":10.73732272749615,\"lng\":122.532856464386},{\"lat\":10.737944997652226,\"lng\":122.53339290618898},{\"lat\":10.738577813445717,\"lng\":122.5323522090912},{\"lat\":10.745430456513297,\"lng\":122.53731429576875},{\"lat\":10.745767950070027,\"lng\":122.53713190555574},{\"lat\":10.746021069989961,\"lng\":122.53715872764589},{\"lat\":10.74644820937363,\"lng\":122.53772199153902},{\"lat\":10.746616955630282,\"lng\":122.53784000873567},{\"lat\":10.746859528208942,\"lng\":122.53774344921113},{\"lat\":10.747139013764427,\"lng\":122.53742158412935},{\"lat\":10.747460685498577,\"lng\":122.53757715225221},{\"lat\":10.747682164198235,\"lng\":122.53726065158845},{\"lat\":10.747877276251359,\"lng\":122.53731966018678},{\"lat\":10.748109301231501,\"lng\":122.53716945648195},{\"lat\":10.748351872610925,\"lng\":122.53709971904756},{\"lat\":10.748678816335598,\"lng\":122.53710508346559},{\"lat\":10.749069039027278,\"lng\":122.53998577594757},{\"lat\":10.750847776960537,\"lng\":122.5409781932831},{\"lat\":10.75268286068475,\"lng\":122.54191160202028},{\"lat\":10.754502113704126,\"lng\":122.5426894426346},{\"lat\":10.75548292382347,\"lng\":122.54231929779054},{\"lat\":10.756094610240144,\"lng\":122.54133760929109},{\"lat\":10.756537554801954,\"lng\":122.54009842872621},{\"lat\":10.756822304533896,\"lng\":122.53992140293123},{\"lat\":10.757122873403699,\"lng\":122.5398623943329},{\"lat\":10.757528904559168,\"lng\":122.54004478454591},{\"lat\":10.758362691749184,\"lng\":122.54075288772584},{\"lat\":10.75861052799404,\"lng\":122.5410318374634},{\"lat\":10.758816179191514,\"lng\":122.54117131233217},{\"lat\":10.759954137999841,\"lng\":122.54157900810243},{\"lat\":10.760122876702306,\"lng\":122.54186868667604},{\"lat\":10.7602441575864,\"lng\":122.54226028919221},{\"lat\":10.760212519099605,\"lng\":122.54256606101991},{\"lat\":10.760133422868087,\"lng\":122.54301130771638},{\"lat\":10.759785399202926,\"lng\":122.54408419132234},{\"lat\":10.759511198456517,\"lng\":122.54448115825654},{\"lat\":10.75776579939855,\"lng\":122.54631578922273},{\"lat\":10.757713068151967,\"lng\":122.54661083221437},{\"lat\":10.757829076882285,\"lng\":122.54696488380434},{\"lat\":10.758008363014088,\"lng\":122.54731357097626},{\"lat\":10.75845130476505,\"lng\":122.54786610603334},{\"lat\":10.762052260662934,\"lng\":122.55071997642519},{\"lat\":10.762157721629052,\"lng\":122.55105793476106},{\"lat\":10.76220517905179,\"lng\":122.55151927471162},{\"lat\":10.762874855220298,\"lng\":122.55333781242372},{\"lat\":10.76587885512153,\"lng\":122.56010234355928},{\"lat\":10.773443344586504,\"lng\":122.56478548049928},{\"lat\":10.781195175870637,\"lng\":122.57124423980714},{\"lat\":10.777692891285389,\"lng\":122.57683396339418},{\"lat\":10.775973961586164,\"lng\":122.57761716842653},{\"lat\":10.77389646903429,\"lng\":122.57906556129457},{\"lat\":10.773537915569745,\"lng\":122.57912993431093},{\"lat\":10.773316455863661,\"lng\":122.57959127426147},{\"lat\":10.772833168015064,\"lng\":122.57996678352357},{\"lat\":10.772806803711173,\"lng\":122.58028864860535},{\"lat\":10.772574797737429,\"lng\":122.58049249649049},{\"lat\":10.772416611743743,\"lng\":122.58041203022005},{\"lat\":10.772015873521221,\"lng\":122.58088409900667},{\"lat\":10.772042237894345,\"lng\":122.58100211620332},{\"lat\":10.772321700107662,\"lng\":122.58131325244905},{\"lat\":10.772363883060725,\"lng\":122.5815922021866},{\"lat\":10.77233224584647,\"lng\":122.58183360099794},{\"lat\":10.771869994196958,\"lng\":122.58278310298921},{\"lat\":10.772602923265268,\"lng\":122.58340537548067},{\"lat\":10.772882384958258,\"lng\":122.58380234241487},{\"lat\":10.773030024993245,\"lng\":122.58452653884889},{\"lat\":10.773045843564125,\"lng\":122.58474111557008},{\"lat\":10.773003660706582,\"lng\":122.58521854877473},{\"lat\":10.772544921749313,\"lng\":122.58628606796266},{\"lat\":10.771875267074332,\"lng\":122.58637189865114},{\"lat\":10.771137063344916,\"lng\":122.58718729019166},{\"lat\":10.770435768126049,\"lng\":122.58723556995393},{\"lat\":10.770119393808626,\"lng\":122.58680641651155},{\"lat\":10.769760835847146,\"lng\":122.58657574653627},{\"lat\":10.76902412248381,\"lng\":122.58764863014223},{\"lat\":10.768317549406042,\"lng\":122.5879329442978},{\"lat\":10.767937897515639,\"lng\":122.58747160434724},{\"lat\":10.767378964695205,\"lng\":122.58704245090486},{\"lat\":10.765952041026003,\"lng\":122.58875370025636},{\"lat\":10.760534164953125,\"lng\":122.59421467781068},{\"lat\":10.760023040364553,\"lng\":122.59535729885103},{\"lat\":10.751903068966891,\"lng\":122.60712146759035},{\"lat\":10.75076404985307,\"lng\":122.61720657348634},{\"lat\":10.735931349203224,\"lng\":122.61439561843873},{\"lat\":10.72195526900212,\"lng\":122.60742187500001},{\"lat\":10.708622937060648,\"lng\":122.60334491729738},{\"lat\":10.695374405820736,\"lng\":122.60128498077394},{\"lat\":10.687568471588653,\"lng\":122.59789466857912},{\"lat\":10.685176471428372,\"lng\":122.5932276248932},{\"lat\":10.67931063462524,\"lng\":122.58639335632326},{\"lat\":10.675261243692967,\"lng\":122.57771372795106},{\"lat\":10.677528854702107,\"lng\":122.57229566574098},{\"lat\":10.678889678343888,\"lng\":122.56770372390748},{\"lat\":10.677750384547464,\"lng\":122.5618886947632},{\"lat\":10.675356197727622,\"lng\":122.55502223968507},{\"lat\":10.672509797371733,\"lng\":122.54862785339357},{\"lat\":10.659329907098499,\"lng\":122.53686904907228},{\"lat\":10.649089521506058,\"lng\":122.51724600791933},{\"lat\":10.63929979646738,\"lng\":122.4879026412964},{\"lat\":10.681531605310644,\"lng\":122.49460816383363}]', '2025-10-02 01:59:20', 'blue');

-- --------------------------------------------------------

--
-- Table structure for table `product_favorites`
--

CREATE TABLE `product_favorites` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_favorites`
--

INSERT INTO `product_favorites` (`id`, `product_id`, `user_id`, `created_at`) VALUES
(1, 3, 1, '2025-12-09 07:59:21'),
(2, 2, 1, '2025-12-09 07:59:22'),
(3, 1, 1, '2025-12-09 07:59:23'),
(4, 5, 6, '2025-12-09 10:13:49'),
(5, 4, 6, '2025-12-09 10:13:55');

-- --------------------------------------------------------

--
-- Table structure for table `product_ratings`
--

CREATE TABLE `product_ratings` (
  `id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `rated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `product_ratings`
--

INSERT INTO `product_ratings` (`id`, `product_id`, `user_id`, `rating`, `rated_at`) VALUES
(1, 3, 1, 4, '2025-12-09 08:12:54'),
(2, 2, 1, 4, '2025-12-09 08:12:53'),
(3, 1, 1, 5, '2025-12-09 08:12:52'),
(7, 5, 6, 2, '2025-12-09 10:13:53'),
(8, 4, 6, 2, '2025-12-09 10:13:56');

-- --------------------------------------------------------

--
-- Table structure for table `stalls`
--

CREATE TABLE `stalls` (
  `id` int(11) NOT NULL,
  `lat` double NOT NULL,
  `lng` double NOT NULL,
  `status` enum('available','reserved','occupied') NOT NULL DEFAULT 'available',
  `views` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `favorites_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `ratings_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `avg_rating` decimal(3,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stalls`
--

INSERT INTO `stalls` (`id`, `lat`, `lng`, `status`, `views`, `favorites_count`, `ratings_count`, `avg_rating`) VALUES
(14, 10.717559593342564, 122.55811088718475, 'available', 0, 0, 0, 0.00),
(15, 10.7175035906591, 122.55807383917275, 'available', 0, 0, 0, 0.00),
(16, 10.717421635242786, 122.55806017667058, 'occupied', 30, 1, 1, 4.00),
(17, 10.717806941835493, 122.55830459296705, 'occupied', 6, 1, 1, 3.00);

-- --------------------------------------------------------

--
-- Table structure for table `stall_applications`
--

CREATE TABLE `stall_applications` (
  `id` int(11) NOT NULL,
  `stall_id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `stall_name` varchar(255) NOT NULL,
  `product_type` varchar(150) NOT NULL,
  `stall_image` varchar(255) DEFAULT NULL,
  `stall_size` varchar(50) NOT NULL,
  `status` enum('pending','approved','rejected','cancelled') NOT NULL DEFAULT 'pending',
  `applied_at` datetime NOT NULL DEFAULT current_timestamp(),
  `vendor_notified` tinyint(1) NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stall_applications`
--

INSERT INTO `stall_applications` (`id`, `stall_id`, `vendor_id`, `stall_name`, `product_type`, `stall_image`, `stall_size`, `status`, `applied_at`, `vendor_notified`) VALUES
(10, 16, 3, 'Azi Merchandises', 'Merchandise', '1765267076_o0AEQEiInerbZClGgDbuEJAAkeIJAlB96ZitnR_tplv-sdweummd6v-text-logo-v1_QGxhYm9mc210aA___q75.jpeg', '3x3', 'approved', '2025-12-09 15:57:56', 1),
(13, 17, 6, 'JNC Milktea', 'Beverages', '1765274861_48703898423_e28f8e4efb_b.jpg', '3X3', 'approved', '2025-12-09 18:07:41', 1);

-- --------------------------------------------------------

--
-- Table structure for table `stall_favorites`
--

CREATE TABLE `stall_favorites` (
  `id` int(11) NOT NULL,
  `stall_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stall_favorites`
--

INSERT INTO `stall_favorites` (`id`, `stall_id`, `user_id`, `created_at`) VALUES
(1, 16, 1, '2025-12-09 07:59:09'),
(2, 17, 6, '2025-12-09 10:13:50');

-- --------------------------------------------------------

--
-- Table structure for table `stall_ratings`
--

CREATE TABLE `stall_ratings` (
  `id` int(11) NOT NULL,
  `stall_id` int(11) NOT NULL,
  `user_id` int(11) NOT NULL,
  `rating` tinyint(4) NOT NULL,
  `rated_at` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `stall_ratings`
--

INSERT INTO `stall_ratings` (`id`, `stall_id`, `user_id`, `rating`, `rated_at`) VALUES
(1, 16, 1, 4, '2025-12-09 08:12:46'),
(2, 17, 6, 3, '2025-12-09 10:13:51');

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int(11) NOT NULL,
  `username` varchar(50) NOT NULL,
  `password` varchar(255) NOT NULL,
  `role` enum('admin','editor','viewer') DEFAULT 'editor'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- --------------------------------------------------------

--
-- Table structure for table `vendor_products`
--

CREATE TABLE `vendor_products` (
  `id` int(11) NOT NULL,
  `vendor_id` int(11) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text DEFAULT NULL,
  `price` decimal(10,2) NOT NULL DEFAULT 0.00,
  `stock` int(11) NOT NULL DEFAULT 0,
  `category` varchar(100) NOT NULL,
  `image` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  `views` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `favorites_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `ratings_count` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `avg_rating` decimal(3,2) NOT NULL DEFAULT 0.00,
  `total_sold` int(10) UNSIGNED NOT NULL DEFAULT 0,
  `total_sales` decimal(12,2) NOT NULL DEFAULT 0.00
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Dumping data for table `vendor_products`
--

INSERT INTO `vendor_products` (`id`, `vendor_id`, `name`, `description`, `price`, `stock`, `category`, `image`, `created_at`, `updated_at`, `views`, `favorites_count`, `ratings_count`, `avg_rating`, `total_sold`, `total_sales`) VALUES
(1, 3, 'Ayaka KeychaiN', 'AYAYA', 130.00, 74, 'Merch', '1765279227_ayaka.jpg', '2025-12-09 07:35:08', '2025-12-09 11:20:27', 2, 1, 1, 5.00, 26, 3380.00),
(2, 3, 'Mavuika Keychain', 'Pyro Archon', 135.00, 95, 'Merch', '1765278216_mavuika.jpeg', '2025-12-09 07:36:05', '2025-12-09 11:03:36', 2, 1, 1, 4.00, 5, 675.00),
(3, 3, 'Furina Keychain', 'Lady Furina the Hydro Archon', 135.00, 81, 'Merch', '1765278347_furina.jpg', '2025-12-09 07:36:37', '2025-12-09 13:02:42', 5, 1, 1, 4.00, 19, 2565.00),
(5, 6, 'Chocolate', 'Chocolatey!', 160.00, 100, 'Beverages', 'prod_6937f650b2d5f_Chocolate-Milktea.jpg', '2025-12-09 10:13:36', '2025-12-09 10:13:53', 0, 1, 1, 2.00, 0, 0.00),
(6, 6, 'Wintermelon', 'WINTER! TASTY!', 165.00, 100, 'Beverages', 'prod_69381d61d78aa_Wintermelon-Milk-Tea.jpg', '2025-12-09 13:00:17', '2025-12-09 13:00:17', 0, 0, 0, 0.00, 0, 0.00);

-- --------------------------------------------------------
--
-- Table structure for table `stall_products`
--

CREATE TABLE `stall_products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `stall_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_stall_product` (`stall_id`,`product_id`),
  KEY `stall_products_stall_id_idx` (`stall_id`),
  KEY `stall_products_product_id_idx` (`product_id`),
  CONSTRAINT `fk_stall_products_stall` FOREIGN KEY (`stall_id`) REFERENCES `stalls` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_stall_products_product` FOREIGN KEY (`product_id`) REFERENCES `vendor_products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD PRIMARY KEY (`id`),
  ADD KEY `user_id` (`user_id`);

--
-- Indexes for table `markers`
--
ALTER TABLE `markers`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `polygons`
--
ALTER TABLE `polygons`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `polylines`
--
ALTER TABLE `polylines`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `product_favorites`
--
ALTER TABLE `product_favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_product_user` (`product_id`,`user_id`),
  ADD KEY `product_favorites_user_id_idx` (`user_id`);

--
-- Indexes for table `product_ratings`
--
ALTER TABLE `product_ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_product_rating` (`product_id`,`user_id`),
  ADD UNIQUE KEY `uniq_product_user` (`product_id`,`user_id`),
  ADD KEY `product_ratings_user_id_idx` (`user_id`);

--
-- Indexes for table `stalls`
--
ALTER TABLE `stalls`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `stall_applications`
--
ALTER TABLE `stall_applications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `fk_stall` (`stall_id`),
  ADD KEY `fk_vendor` (`vendor_id`);

--
-- Indexes for table `stall_favorites`
--
ALTER TABLE `stall_favorites`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_stall_user` (`stall_id`,`user_id`),
  ADD KEY `stall_favorites_user_id_idx` (`user_id`);

--
-- Indexes for table `stall_ratings`
--
ALTER TABLE `stall_ratings`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uniq_stall_rating` (`stall_id`,`user_id`),
  ADD UNIQUE KEY `uniq_stall_user` (`stall_id`,`user_id`),
  ADD KEY `stall_ratings_user_id_idx` (`user_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `username` (`username`);

--
-- Indexes for table `vendor_products`
--
ALTER TABLE `vendor_products`
  ADD PRIMARY KEY (`id`),
  ADD KEY `vendor_products_vendor_id_idx` (`vendor_id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `audit_log`
--
ALTER TABLE `audit_log`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `markers`
--
ALTER TABLE `markers`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=32;

--
-- AUTO_INCREMENT for table `polygons`
--
ALTER TABLE `polygons`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=10;

--
-- AUTO_INCREMENT for table `polylines`
--
ALTER TABLE `polylines`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=13;

--
-- AUTO_INCREMENT for table `product_favorites`
--
ALTER TABLE `product_favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `product_ratings`
--
ALTER TABLE `product_ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=9;

--
-- AUTO_INCREMENT for table `stalls`
--
ALTER TABLE `stalls`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=18;

--
-- AUTO_INCREMENT for table `stall_applications`
--
ALTER TABLE `stall_applications`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=15;

--
-- AUTO_INCREMENT for table `stall_favorites`
--
ALTER TABLE `stall_favorites`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `stall_ratings`
--
ALTER TABLE `stall_ratings`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `vendor_products`
--
ALTER TABLE `vendor_products`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `audit_log`
--
ALTER TABLE `audit_log`
  ADD CONSTRAINT `audit_log_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `stall_applications`
--
ALTER TABLE `stall_applications`
  ADD CONSTRAINT `fk_stall` FOREIGN KEY (`stall_id`) REFERENCES `stalls` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
