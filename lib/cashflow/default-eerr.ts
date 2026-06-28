import type { ParsedEerrExcel } from "@/lib/cashflow/parse-eerr-excel";
import { extendEerrHorizon } from "@/lib/cashflow/extend-eerr-horizon";
import { EERR_HORIZON_YEARS, FULL_RAMP_SCHEDULE, type EerrYearSlice } from "@/lib/cashflow/eerr-years";
import { applyEerrBusinessRules } from "@/lib/cashflow/eerr-rules";
import { applyEerrModelParams, RAMP_UP_SCHEDULE } from "@/lib/cashflow/eerr-model-params";
import {
  closingAugustValue,
  reorderYearToOperationalMonths,
} from "@/lib/cashflow/months";

function processDefaultYear(
  year: EerrYearSlice,
  allRawYears: EerrYearSlice[],
): EerrYearSlice {
  const yearIndex = allRawYears.findIndex((item) => item.id === year.id);
  const reordered = reorderYearToOperationalMonths(year, (row) =>
    closingAugustValue(row, year, allRawYears[yearIndex + 1]),
  );
  const year1Ramp = [...RAMP_UP_SCHEDULE.slice(1), 1];
  const options =
    reordered.id === "year1"
      ? { salesRampSchedule: year1Ramp }
      : { salesRampSchedule: FULL_RAMP_SCHEDULE, fullNominaRamp: true };
  return {
    ...reordered,
    rows: applyEerrModelParams(applyEerrBusinessRules(reordered.rows), options),
  };
}

/** EERR importado desde «Ortiz cashflow Diego.xlsx» (Año 1 y 2 del Excel). */
const RAW_DEFAULT_EERR_DATA: ParsedEerrExcel = {
  "sourceFileName": "Ortiz cashflow Diego.xlsx",
  "sheetName": "EERR Mensual",
  "years": [
    {
      "id": "year1",
      "label": "Año 1",
      "months": [
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul"
      ],
      "rows": [
        {
          "id": "year1-row-4",
          "label": "Ventas",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            141063615.00000003,
            163970730,
            171328657.50000003,
            252082215.00000003,
            215748225.00000003,
            162356040.00000003,
            189497385,
            264916575.00000003,
            279996255,
            282051000,
            217983150,
            264171600.00000006
          ],
          "yearTotal": 2605165447.5
        },
        {
          "id": "year1-row-5",
          "label": "Cubiertos",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "covers",
          "values": [
            4478.210000000001,
            5205.42,
            5439.005000000001,
            8002.610000000001,
            6849.150000000001,
            5154.160000000001,
            6015.79,
            8410.050000000001,
            8888.77,
            8954,
            6920.1,
            8386.400000000001
          ],
          "yearTotal": 82703.66500000001
        },
        {
          "id": "year1-row-6",
          "label": "Ramp - up",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "percent",
          "values": [
            0.55,
            0.6,
            0.65,
            0.7,
            0.75,
            0.8,
            0.85,
            0.9,
            0.95,
            1,
            1,
            1
          ],
          "yearTotal": 0.8125
        },
        {
          "id": "year1-row-7",
          "label": "Proyeccion Ventas",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "covers",
          "values": [
            8142.200000000001,
            8675.7,
            8367.7,
            11432.300000000001,
            9132.2,
            6442.700000000001,
            7077.400000000001,
            9344.5,
            9356.6,
            8954,
            6920.1,
            8386.400000000001
          ],
          "yearTotal": 102231.80000000002
        },
        {
          "id": "year1-row-9",
          "label": "Costos Variables",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            69121171.35000002,
            80345657.7,
            83951042.17500001,
            123520285.35000002,
            105716630.25000001,
            79554459.60000001,
            92853718.64999999,
            129809121.75000001,
            137198164.95,
            138204990,
            106811743.50000001,
            129444084.00000003
          ],
          "yearTotal": 1276531069.275
        },
        {
          "id": "year1-row-10",
          "label": "Costo de mercadería",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            47961629.10000002,
            55750048.2,
            58251743.55000001,
            85707953.10000001,
            73354396.50000001,
            55201053.60000001,
            64429110.9,
            90071635.50000001,
            95198726.7,
            95897340,
            74114271.00000001,
            89818344.00000003
          ],
          "yearTotal": 885756252.1500001
        },
        {
          "id": "year1-row-11",
          "label": "Costo delivery",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2115954.2250000006,
            2459560.9499999997,
            2569929.8625000003,
            3781233.225,
            3236223.375,
            2435340.6,
            2842460.7749999994,
            3973748.6250000005,
            4199943.824999999,
            4230765,
            3269747.25,
            3962574.000000001
          ],
          "yearTotal": 39077481.7125
        },
        {
          "id": "year1-row-12",
          "label": "Gastos adición",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            352659.0375000001,
            409926.825,
            428321.64375000005,
            630205.5375000001,
            539370.5625,
            405890.1000000001,
            473743.46249999997,
            662291.4375000001,
            699990.6375,
            705127.5,
            544957.875,
            660429.0000000001
          ],
          "yearTotal": 6512913.61875
        },
        {
          "id": "year1-row-13",
          "label": "Com. / Impuestos (Incluye Iva)",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            15516997.650000004,
            18036780.3,
            18846152.325000003,
            27729043.650000002,
            23732304.75,
            17859164.400000002,
            20844712.349999998,
            29140823.250000004,
            30799588.049999997,
            31025610,
            23978146.500000004,
            29058876.000000007
          ],
          "yearTotal": 286568199.225
        },
        {
          "id": "year1-row-14",
          "label": "Mantenimiento",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            1410636.1500000004,
            1639707.3,
            1713286.5750000002,
            2520822.1500000004,
            2157482.25,
            1623560.4000000004,
            1894973.8499999999,
            2649165.7500000005,
            2799962.55,
            2820510,
            2179831.5,
            2641716.0000000005
          ],
          "yearTotal": 26051654.475
        },
        {
          "id": "year1-row-15",
          "label": "Bazar",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            352659.0375000001,
            409926.825,
            428321.64375000005,
            630205.5375000001,
            539370.5625,
            405890.1000000001,
            473743.46249999997,
            662291.4375000001,
            699990.6375,
            705127.5,
            544957.875,
            660429.0000000001
          ],
          "yearTotal": 6512913.61875
        },
        {
          "id": "year1-row-16",
          "label": "Inversión",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            1410636.1500000004,
            1639707.3,
            1713286.5750000002,
            2520822.1500000004,
            2157482.25,
            1623560.4000000004,
            1894973.8499999999,
            2649165.7500000005,
            2799962.55,
            2820510,
            2179831.5,
            2641716.0000000005
          ],
          "yearTotal": 26051654.475
        },
        {
          "id": "year1-row-18",
          "label": "Margen bruto",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            71942443.65,
            83625072.3,
            87377615.32500002,
            128561929.65,
            110031594.75000001,
            82801580.40000002,
            96643666.35000001,
            135107453.25,
            142798090.05,
            143846010,
            111171406.49999999,
            134727516.00000003
          ],
          "yearTotal": 1328634378.2250001
        },
        {
          "id": "year1-row-21",
          "label": "Ramp - up Nómina",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "percent",
          "values": [
            0.67,
            0.67,
            0.67,
            0.75,
            0.75,
            0.67,
            0.67,
            0.75,
            0.75,
            0.75,
            0.75,
            0.9
          ],
          "yearTotal": 0.7291666666666666
        },
        {
          "id": "year1-row-22",
          "label": "Costos Estructura",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            77150000,
            77150000,
            77150000,
            82350000,
            82350000,
            77150000,
            77150000,
            82350000,
            82350000,
            82350000,
            82350000,
            92100000
          ],
          "yearTotal": 971950000
        },
        {
          "id": "year1-row-23",
          "label": "RRHH",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            40200000,
            40200000,
            40200000,
            45000000,
            45000000,
            40200000,
            40200000,
            45000000,
            45000000,
            45000000,
            45000000,
            54000000
          ],
          "yearTotal": 525000000
        },
        {
          "id": "year1-row-24",
          "label": "Costo Locativo",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000
          ],
          "yearTotal": 150000000
        },
        {
          "id": "year1-row-25",
          "label": "Servicios públicos",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000
          ],
          "yearTotal": 81600000
        },
        {
          "id": "year1-row-26",
          "label": "Marketing",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000
          ],
          "yearTotal": 24000000
        },
        {
          "id": "year1-row-27",
          "label": "Gastos Operativos",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000
          ],
          "yearTotal": 36000000
        },
        {
          "id": "year1-row-28",
          "label": "Honorarios",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000
          ],
          "yearTotal": 27600000
        },
        {
          "id": "year1-row-29",
          "label": "Previsión aguinaldo",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            3350000,
            3350000,
            3350000,
            3750000,
            3750000,
            3350000,
            3350000,
            3750000,
            3750000,
            3750000,
            3750000,
            4500000
          ],
          "yearTotal": 43750000
        },
        {
          "id": "year1-row-30",
          "label": "Costo de gestión operativo",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000
          ],
          "yearTotal": 84000000
        },
        {
          "id": "year1-row-33",
          "label": "EBITDA",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            -5207556.349999994,
            6475072.299999997,
            10227615.325000018,
            46211929.650000006,
            27681594.750000015,
            5651580.400000021,
            19493666.35000001,
            52757453.25,
            60448090.05000001,
            61496010,
            28821406.499999985,
            42627516.00000003
          ],
          "yearTotal": 356684378.22500014
        },
        {
          "id": "year1-row-36",
          "label": "Depreciaciones",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "percent",
          "values": [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ],
          "yearTotal": 0
        },
        {
          "id": "year1-row-38",
          "label": "EBIT",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            -5207556.349999994,
            6475072.299999997,
            10227615.325000018,
            46211929.650000006,
            27681594.750000015,
            5651580.400000021,
            19493666.35000001,
            52757453.25,
            60448090.05000001,
            61496010,
            28821406.499999985,
            42627516.00000003
          ],
          "yearTotal": 356684378.22500014
        },
        {
          "id": "year1-row-41",
          "label": "Impuestos",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            0,
            323753.6149999999,
            511380.7662500009,
            2310596.4825000004,
            1384079.7375000007,
            282579.02000000107,
            974683.3175000005,
            2637872.6625,
            3022404.502500001,
            3074800.5,
            1441070.3249999993,
            2131375.8000000017
          ],
          "yearTotal": 18094596.728750005
        },
        {
          "id": "year1-row-43",
          "label": "RESULTADO NETO",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            -5207556.349999994,
            6151318.684999997,
            9716234.558750017,
            43901333.167500004,
            26297515.012500014,
            5369001.380000019,
            18518983.03250001,
            50119580.5875,
            57425685.547500014,
            58421209.5,
            27380336.174999986,
            40496140.200000025
          ],
          "yearTotal": 338589781.49625015
        }
      ]
    },
    {
      "id": "year2",
      "label": "Año 2",
      "months": [
        "Ago",
        "Sep",
        "Oct",
        "Nov",
        "Dic",
        "Ene",
        "Feb",
        "Mar",
        "Abr",
        "May",
        "Jun",
        "Jul"
      ],
      "rows": [
        {
          "id": "year2-row-4",
          "label": "Ventas",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            256479300.00000003,
            273284550,
            263582550.00000003,
            360117450.00000006,
            287664300,
            202945050.00000003,
            222938100.00000003,
            294351750,
            294732900,
            282051000,
            217983150,
            264171600.00000006
          ],
          "yearTotal": 3220301700
        },
        {
          "id": "year2-row-5",
          "label": "Cubiertos",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "covers",
          "values": [
            8142.200000000001,
            8675.7,
            8367.7,
            11432.300000000001,
            9132.2,
            6442.700000000001,
            7077.400000000001,
            9344.5,
            9356.6,
            8954,
            6920.1,
            8386.400000000001
          ],
          "yearTotal": 102231.80000000002
        },
        {
          "id": "year2-row-6",
          "label": "Ramp - up",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "percent",
          "values": [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          "yearTotal": 1
        },
        {
          "id": "year2-row-7",
          "label": "Proyeccion Ventas",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "covers",
          "values": [
            8142.200000000001,
            8675.7,
            8367.7,
            11432.300000000001,
            9132.2,
            6442.700000000001,
            7077.400000000001,
            9344.5,
            9356.6,
            8954,
            6920.1,
            8386.400000000001
          ],
          "yearTotal": 102231.80000000002
        },
        {
          "id": "year2-row-9",
          "label": "Costos Variables",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            125674857.00000001,
            133909429.5,
            129155449.50000001,
            176457550.50000003,
            140955507,
            99443074.50000001,
            109239669.00000001,
            144232357.5,
            144419121,
            138204990,
            106811743.5,
            129444084.00000003
          ],
          "yearTotal": 1577947833
        },
        {
          "id": "year2-row-10",
          "label": "Costo de mercadería",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            87202962.00000001,
            92916747,
            89618067.00000001,
            122439933.00000003,
            97805862,
            69001317.00000001,
            75798954.00000001,
            100079595,
            100209186,
            95897340,
            74114271,
            89818344.00000003
          ],
          "yearTotal": 1094902578
        },
        {
          "id": "year2-row-11",
          "label": "Costo delivery",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            3847189.5,
            4099268.25,
            3953738.2500000005,
            5401761.750000001,
            4314964.5,
            3044175.7500000005,
            3344071.5000000005,
            4415276.25,
            4420993.5,
            4230765,
            3269747.25,
            3962574.000000001
          ],
          "yearTotal": 48304525.5
        },
        {
          "id": "year2-row-12",
          "label": "Gastos adición",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            641198.2500000001,
            683211.375,
            658956.3750000001,
            900293.6250000001,
            719160.75,
            507362.62500000006,
            557345.2500000001,
            735879.375,
            736832.25,
            705127.5,
            544957.875,
            660429.0000000001
          ],
          "yearTotal": 8050754.25
        },
        {
          "id": "year2-row-13",
          "label": "Com. / Impuestos (Incluye Iva)",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            28212723.000000004,
            30061300.5,
            28994080.500000004,
            39612919.50000001,
            31643073,
            22323955.500000004,
            24523191.000000004,
            32378692.5,
            32420619,
            31025610,
            23978146.5,
            29058876.000000007
          ],
          "yearTotal": 354233187
        },
        {
          "id": "year2-row-14",
          "label": "Mantenimiento",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2564793.0000000005,
            2732845.5,
            2635825.5000000005,
            3601174.5000000005,
            2876643,
            2029450.5000000002,
            2229381.0000000005,
            2943517.5,
            2947329,
            2820510,
            2179831.5,
            2641716.0000000005
          ],
          "yearTotal": 32203017
        },
        {
          "id": "year2-row-15",
          "label": "Bazar",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            641198.2500000001,
            683211.375,
            658956.3750000001,
            900293.6250000001,
            719160.75,
            507362.62500000006,
            557345.2500000001,
            735879.375,
            736832.25,
            705127.5,
            544957.875,
            660429.0000000001
          ],
          "yearTotal": 8050754.25
        },
        {
          "id": "year2-row-16",
          "label": "Inversión",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2564793.0000000005,
            2732845.5,
            2635825.5000000005,
            3601174.5000000005,
            2876643,
            2029450.5000000002,
            2229381.0000000005,
            2943517.5,
            2947329,
            2820510,
            2179831.5,
            2641716.0000000005
          ],
          "yearTotal": 32203017
        },
        {
          "id": "year2-row-18",
          "label": "Margen bruto",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            130804443.00000001,
            139375120.5,
            134427100.5,
            183659899.50000003,
            146708793,
            103501975.50000001,
            113698431.00000001,
            150119392.5,
            150313779,
            143846010,
            111171406.5,
            134727516.00000003
          ],
          "yearTotal": 1642353867
        },
        {
          "id": "year2-row-21",
          "label": "Ramp - up Nómina",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "percent",
          "values": [
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1,
            1
          ],
          "yearTotal": 1
        },
        {
          "id": "year2-row-22",
          "label": "Costos Estructura",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000,
            98600000
          ],
          "yearTotal": 1183200000
        },
        {
          "id": "year2-row-23",
          "label": "RRHH",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000,
            60000000
          ],
          "yearTotal": 720000000
        },
        {
          "id": "year2-row-24",
          "label": "Costo Locativo",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000,
            12500000
          ],
          "yearTotal": 150000000
        },
        {
          "id": "year2-row-25",
          "label": "Servicios públicos",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000,
            6800000
          ],
          "yearTotal": 81600000
        },
        {
          "id": "year2-row-26",
          "label": "Marketing",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000,
            2000000
          ],
          "yearTotal": 24000000
        },
        {
          "id": "year2-row-27",
          "label": "Gastos Operativos",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000,
            3000000
          ],
          "yearTotal": 36000000
        },
        {
          "id": "year2-row-28",
          "label": "Honorarios",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000,
            2300000
          ],
          "yearTotal": 27600000
        },
        {
          "id": "year2-row-29",
          "label": "Previsión aguinaldo",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000,
            5000000
          ],
          "yearTotal": 60000000
        },
        {
          "id": "year2-row-30",
          "label": "Costo de gestión operativo",
          "isSubRow": true,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000,
            7000000
          ],
          "yearTotal": 84000000
        },
        {
          "id": "year2-row-33",
          "label": "EBITDA",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            32204443.000000015,
            40775120.5,
            35827100.5,
            85059899.50000003,
            48108793,
            4901975.500000015,
            15098431.000000015,
            51519392.5,
            51713779,
            45246010,
            12571406.5,
            36127516.00000003
          ],
          "yearTotal": 459153867.0000001
        },
        {
          "id": "year2-row-36",
          "label": "Depreciaciones",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "percent",
          "values": [
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0,
            0
          ],
          "yearTotal": 0
        },
        {
          "id": "year2-row-38",
          "label": "EBIT",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            32204443.000000015,
            40775120.5,
            35827100.5,
            85059899.50000003,
            48108793,
            4901975.500000015,
            15098431.000000015,
            51519392.5,
            51713779,
            45246010,
            12571406.5,
            36127516.00000003
          ],
          "yearTotal": 459153867.0000001
        },
        {
          "id": "year2-row-41",
          "label": "Impuestos",
          "isSubRow": false,
          "isSection": false,
          "valueKind": "currency",
          "values": [
            1610222.1500000008,
            2038756.0250000001,
            1791355.0250000001,
            4252994.9750000015,
            2405439.65,
            245098.77500000075,
            754921.5500000007,
            2575969.625,
            2585688.95,
            2262300.5,
            628570.3250000001,
            1806375.8000000017
          ],
          "yearTotal": 22957693.350000005
        },
        {
          "id": "year2-row-43",
          "label": "RESULTADO NETO",
          "isSubRow": false,
          "isSection": true,
          "valueKind": "currency",
          "emphasis": "section",
          "values": [
            30594220.850000013,
            38736364.475,
            34035745.475,
            80806904.52500004,
            45703353.35,
            4656876.7250000145,
            14343509.450000014,
            48943422.875,
            49128090.05,
            42983709.5,
            11942836.175,
            34321140.200000025
          ],
          "yearTotal": 436196173.65000015
        }
      ]
    }
  ],
  "params": [
    {
      "label": "Precision Cubiertos",
      "displayValue": "1"
    },
    {
      "label": "Ticket Promedio",
      "displayValue": "$ 31.500"
    },
    {
      "label": "Porcentaje CMV",
      "displayValue": "34.0%"
    },
    {
      "label": "Costo Delivery",
      "displayValue": "1.5%"
    },
    {
      "label": "Gastos Adición",
      "displayValue": "0.3%"
    },
    {
      "label": "Com. / Impuestos",
      "displayValue": "11.0%"
    },
    {
      "label": "Marketing",
      "displayValue": "$ 2.000.000"
    },
    {
      "label": "Nomina Full",
      "displayValue": "$ 60.000.000"
    },
    {
      "label": "Mantenimiento",
      "displayValue": "1.0%"
    },
    {
      "label": "Gastos Operativos",
      "displayValue": "$ 3.000.000"
    },
    {
      "label": "Honorarios",
      "displayValue": "$ 2.300.000"
    },
    {
      "label": "Bazar",
      "displayValue": "0.3%"
    },
    {
      "label": "Inversión",
      "displayValue": "1.0%"
    },
    {
      "label": "IIGG",
      "displayValue": "5.0%"
    },
    {
      "label": "Fondo Despidos",
      "displayValue": "1.0%"
    }
  ],
  "months": [
    "Ago",
    "Sep",
    "Oct",
    "Nov",
    "Dic",
    "Ene",
    "Feb",
    "Mar",
    "Abr",
    "May",
    "Jun",
    "Jul"
  ],
  "rows": [
    {
      "id": "year1-row-4",
      "label": "Ventas",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        141063615.00000003,
        163970730,
        171328657.50000003,
        252082215.00000003,
        215748225.00000003,
        162356040.00000003,
        189497385,
        264916575.00000003,
        279996255,
        282051000,
        217983150,
        264171600.00000006
      ],
      "yearTotal": 2605165447.5
    },
    {
      "id": "year1-row-5",
      "label": "Cubiertos",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "covers",
      "values": [
        4478.210000000001,
        5205.42,
        5439.005000000001,
        8002.610000000001,
        6849.150000000001,
        5154.160000000001,
        6015.79,
        8410.050000000001,
        8888.77,
        8954,
        6920.1,
        8386.400000000001
      ],
      "yearTotal": 82703.66500000001
    },
    {
      "id": "year1-row-6",
      "label": "Ramp - up",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "percent",
      "values": [
        0.55,
        0.6,
        0.65,
        0.7,
        0.75,
        0.8,
        0.85,
        0.9,
        0.95,
        1,
        1,
        1
      ],
      "yearTotal": 0.8125
    },
    {
      "id": "year1-row-7",
      "label": "Proyeccion Ventas",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "covers",
      "values": [
        8142.200000000001,
        8675.7,
        8367.7,
        11432.300000000001,
        9132.2,
        6442.700000000001,
        7077.400000000001,
        9344.5,
        9356.6,
        8954,
        6920.1,
        8386.400000000001
      ],
      "yearTotal": 102231.80000000002
    },
    {
      "id": "year1-row-9",
      "label": "Costos Variables",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        69121171.35000002,
        80345657.7,
        83951042.17500001,
        123520285.35000002,
        105716630.25000001,
        79554459.60000001,
        92853718.64999999,
        129809121.75000001,
        137198164.95,
        138204990,
        106811743.50000001,
        129444084.00000003
      ],
      "yearTotal": 1276531069.275
    },
    {
      "id": "year1-row-10",
      "label": "Costo de mercadería",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        47961629.10000002,
        55750048.2,
        58251743.55000001,
        85707953.10000001,
        73354396.50000001,
        55201053.60000001,
        64429110.9,
        90071635.50000001,
        95198726.7,
        95897340,
        74114271.00000001,
        89818344.00000003
      ],
      "yearTotal": 885756252.1500001
    },
    {
      "id": "year1-row-11",
      "label": "Costo delivery",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        2115954.2250000006,
        2459560.9499999997,
        2569929.8625000003,
        3781233.225,
        3236223.375,
        2435340.6,
        2842460.7749999994,
        3973748.6250000005,
        4199943.824999999,
        4230765,
        3269747.25,
        3962574.000000001
      ],
      "yearTotal": 39077481.7125
    },
    {
      "id": "year1-row-12",
      "label": "Gastos adición",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        352659.0375000001,
        409926.825,
        428321.64375000005,
        630205.5375000001,
        539370.5625,
        405890.1000000001,
        473743.46249999997,
        662291.4375000001,
        699990.6375,
        705127.5,
        544957.875,
        660429.0000000001
      ],
      "yearTotal": 6512913.61875
    },
    {
      "id": "year1-row-13",
      "label": "Com. / Impuestos (Incluye Iva)",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        15516997.650000004,
        18036780.3,
        18846152.325000003,
        27729043.650000002,
        23732304.75,
        17859164.400000002,
        20844712.349999998,
        29140823.250000004,
        30799588.049999997,
        31025610,
        23978146.500000004,
        29058876.000000007
      ],
      "yearTotal": 286568199.225
    },
    {
      "id": "year1-row-14",
      "label": "Mantenimiento",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        1410636.1500000004,
        1639707.3,
        1713286.5750000002,
        2520822.1500000004,
        2157482.25,
        1623560.4000000004,
        1894973.8499999999,
        2649165.7500000005,
        2799962.55,
        2820510,
        2179831.5,
        2641716.0000000005
      ],
      "yearTotal": 26051654.475
    },
    {
      "id": "year1-row-15",
      "label": "Bazar",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        352659.0375000001,
        409926.825,
        428321.64375000005,
        630205.5375000001,
        539370.5625,
        405890.1000000001,
        473743.46249999997,
        662291.4375000001,
        699990.6375,
        705127.5,
        544957.875,
        660429.0000000001
      ],
      "yearTotal": 6512913.61875
    },
    {
      "id": "year1-row-16",
      "label": "Inversión",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        1410636.1500000004,
        1639707.3,
        1713286.5750000002,
        2520822.1500000004,
        2157482.25,
        1623560.4000000004,
        1894973.8499999999,
        2649165.7500000005,
        2799962.55,
        2820510,
        2179831.5,
        2641716.0000000005
      ],
      "yearTotal": 26051654.475
    },
    {
      "id": "year1-row-18",
      "label": "Margen bruto",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        71942443.65,
        83625072.3,
        87377615.32500002,
        128561929.65,
        110031594.75000001,
        82801580.40000002,
        96643666.35000001,
        135107453.25,
        142798090.05,
        143846010,
        111171406.49999999,
        134727516.00000003
      ],
      "yearTotal": 1328634378.2250001
    },
    {
      "id": "year1-row-21",
      "label": "Ramp - up Nómina",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "percent",
      "values": [
        0.67,
        0.67,
        0.67,
        0.75,
        0.75,
        0.67,
        0.67,
        0.75,
        0.75,
        0.75,
        0.75,
        0.9
      ],
      "yearTotal": 0.7291666666666666
    },
    {
      "id": "year1-row-22",
      "label": "Costos Estructura",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        77150000,
        77150000,
        77150000,
        82350000,
        82350000,
        77150000,
        77150000,
        82350000,
        82350000,
        82350000,
        82350000,
        92100000
      ],
      "yearTotal": 971950000
    },
    {
      "id": "year1-row-23",
      "label": "RRHH",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        40200000,
        40200000,
        40200000,
        45000000,
        45000000,
        40200000,
        40200000,
        45000000,
        45000000,
        45000000,
        45000000,
        54000000
      ],
      "yearTotal": 525000000
    },
    {
      "id": "year1-row-24",
      "label": "Costo Locativo",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000,
        12500000
      ],
      "yearTotal": 150000000
    },
    {
      "id": "year1-row-25",
      "label": "Servicios públicos",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000,
        6800000
      ],
      "yearTotal": 81600000
    },
    {
      "id": "year1-row-26",
      "label": "Marketing",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000,
        2000000
      ],
      "yearTotal": 24000000
    },
    {
      "id": "year1-row-27",
      "label": "Gastos Operativos",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000,
        3000000
      ],
      "yearTotal": 36000000
    },
    {
      "id": "year1-row-28",
      "label": "Honorarios",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000,
        2300000
      ],
      "yearTotal": 27600000
    },
    {
      "id": "year1-row-29",
      "label": "Previsión aguinaldo",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        3350000,
        3350000,
        3350000,
        3750000,
        3750000,
        3350000,
        3350000,
        3750000,
        3750000,
        3750000,
        3750000,
        4500000
      ],
      "yearTotal": 43750000
    },
    {
      "id": "year1-row-30",
      "label": "Costo de gestión operativo",
      "isSubRow": true,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000,
        7000000
      ],
      "yearTotal": 84000000
    },
    {
      "id": "year1-row-33",
      "label": "EBITDA",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        -5207556.349999994,
        6475072.299999997,
        10227615.325000018,
        46211929.650000006,
        27681594.750000015,
        5651580.400000021,
        19493666.35000001,
        52757453.25,
        60448090.05000001,
        61496010,
        28821406.499999985,
        42627516.00000003
      ],
      "yearTotal": 356684378.22500014
    },
    {
      "id": "year1-row-36",
      "label": "Depreciaciones",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "percent",
      "values": [
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0,
        0
      ],
      "yearTotal": 0
    },
    {
      "id": "year1-row-38",
      "label": "EBIT",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        -5207556.349999994,
        6475072.299999997,
        10227615.325000018,
        46211929.650000006,
        27681594.750000015,
        5651580.400000021,
        19493666.35000001,
        52757453.25,
        60448090.05000001,
        61496010,
        28821406.499999985,
        42627516.00000003
      ],
      "yearTotal": 356684378.22500014
    },
    {
      "id": "year1-row-41",
      "label": "Impuestos",
      "isSubRow": false,
      "isSection": false,
      "valueKind": "currency",
      "values": [
        0,
        323753.6149999999,
        511380.7662500009,
        2310596.4825000004,
        1384079.7375000007,
        282579.02000000107,
        974683.3175000005,
        2637872.6625,
        3022404.502500001,
        3074800.5,
        1441070.3249999993,
        2131375.8000000017
      ],
      "yearTotal": 18094596.728750005
    },
    {
      "id": "year1-row-43",
      "label": "RESULTADO NETO",
      "isSubRow": false,
      "isSection": true,
      "valueKind": "currency",
      "emphasis": "section",
      "values": [
        -5207556.349999994,
        6151318.684999997,
        9716234.558750017,
        43901333.167500004,
        26297515.012500014,
        5369001.380000019,
        18518983.03250001,
        50119580.5875,
        57425685.547500014,
        58421209.5,
        27380336.174999986,
        40496140.200000025
      ],
      "yearTotal": 338589781.49625015
    }
  ]
};

export { RAW_DEFAULT_EERR_DATA };

export const DEFAULT_EERR_DATA = extendEerrHorizon(
  {
    ...RAW_DEFAULT_EERR_DATA,
    years: RAW_DEFAULT_EERR_DATA.years.map((year) =>
      processDefaultYear(year, RAW_DEFAULT_EERR_DATA.years),
    ),
    rows: processDefaultYear(RAW_DEFAULT_EERR_DATA.years[0]!, RAW_DEFAULT_EERR_DATA.years).rows,
  },
  EERR_HORIZON_YEARS,
);
