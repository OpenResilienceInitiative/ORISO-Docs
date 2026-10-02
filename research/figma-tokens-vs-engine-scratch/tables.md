| Role | FE uses (files) | AD uses (files) | Used by | Note |
|---|---|---|---|---|
| Primary | 325 (96) | 129 (57) | both |  |
| On Primary | 62 (37) | 23 (14) | both |  |
| Primary Container | 58 (28) | 9 (2) | both | Dark value = Light value (not adapted) |
| On Primary Container | 15 (11) | 2 (2) | both |  |
| Secondary | 128 (48) | 28 (18) | both | inconsistent (Light #655F65 is H318 mauve; every other secondary is H249 slate) |
| On Secondary | 10 (9) | 4 (4) | both |  |
| Secondary Container | 30 (16) | 22 (12) | both | Dark value = Light value (not adapted) |
| On Secondary Container | 11 (9) | 22 (15) | both |  |
| Tertiary | 2 (2) | 0 (0) | FE only | near-duplicate of Secondary (same palette) |
| On Tertiary | 1 (1) | 0 (0) | FE only | near-duplicate of Secondary |
| Tertiary Container | 4 (2) | 1 (1) | both | near-duplicate of Secondary |
| On Tertiary Container | 2 (1) | 0 (0) | FE only | near-duplicate of Secondary |
| Error | 65 (38) | 42 (21) | both |  |
| On Error | 7 (6) | 4 (2) | both |  |
| Error Container | 8 (5) | 0 (0) | FE only | Dark value = Light value (not adapted) |
| On Error Container | 9 (5) | 0 (0) | FE only |  |
| Background | 8 (5) | 1 (1) | both | inconsistent (Light grey page vs MC/HC and Dark values; see 4.3) |
| On Background | 0 (0) | 1 (1) | AD only | inconsistent (red-tinted H25 C11 in all 6, On Surface is neutral) |
| Surface | 34 (22) | 7 (6) | both | Light #FAFBFB cool (H207) vs MC/HC #FCF9F9 warm |
| On Surface | 125 (61) | 106 (47) | both |  |
| Surface Variant | 11 (5) | 1 (1) | both |  |
| On Surface Variant | 167 (69) | 160 (72) | both |  |
| Outline | 28 (17) | 28 (23) | both |  |
| Outline Variant | 64 (39) | 45 (34) | both |  |
| Surface Tint | 0 (0) | 0 (0) | unused | unused as a colour (only as a Surfaces-group overlay base) |
| Shadow | 0 (0) | 8 (2) | AD only | duplicate of Scrim (#000000) |
| Scrim | 1 (1) | 0 (0) | FE only | duplicate of Shadow (#000000) |
| Inverse Surface | 4 (4) | 1 (1) | both |  |
| Inverse On Surface | 5 (5) | 1 (1) | both |  |
| Inverse Primary | 3 (2) | 0 (0) | FE only |  |
| Primary Fixed | 45 (17) | 7 (4) | both |  |
| On Primary Fixed | 9 (6) | 0 (0) | FE only |  |
| Primary Fixed Dim | 17 (11) | 1 (1) | both |  |
| On Primary Fixed Variant | 7 (5) | 0 (0) | FE only |  |
| Secondary Fixed | 2 (1) | 0 (0) | FE only |  |
| On Secondary Fixed | 1 (1) | 0 (0) | FE only |  |
| Secondary Fixed Dim | 3 (2) | 0 (0) | FE only |  |
| On Secondary Fixed Variant | 1 (1) | 0 (0) | FE only |  |
| Tertiary Fixed | 0 (0) | 0 (0) | unused | unused + identical to Secondary Fixed |
| On Tertiary Fixed | 0 (0) | 0 (0) | unused | unused + identical to On Secondary Fixed |
| Tertiary Fixed Dim | 0 (0) | 0 (0) | unused | unused + identical to Secondary Fixed Dim |
| On Tertiary Fixed Variant | 0 (0) | 0 (0) | unused | unused + identical |
| Surface Dim | 0 (0) | 0 (0) | unused | unused |
| Surface Bright | 0 (0) | 0 (0) | unused | unused; Light value is darker than Surface |
| Surface Container Lowest | 58 (34) | 10 (6) | both |  |
| Surface Container Low | 27 (22) | 30 (15) | both |  |
| Surface Container | 33 (21) | 16 (11) | both | Light state layer says #F0EDEE, scheme says #EAE7E8 |
| Surface Container High | 28 (21) | 20 (15) | both | Light state layer says #EAE7E8, scheme says #E7E3E3 |
| Surface Container Highest | 6 (6) | 15 (11) | both |  |
| On Primary Container 2 | 0 (0) | 0 (0) | duplicate | duplicate (identical value in all 6 files, no consumer) |

| Role | Light fig / engine | dE | Dark fig / engine | dE | LMC dE | LHC dE | DMC dE | DHC dE |
|---|---|---|---|---|---|---|---|---|
| Primary | #a5000a / #a5000a | 0 | #ffb4aa / #ffb4aa | 0 | 9.7 | 13.7 | 8.5 | 17.1 |
| On Primary | #ffffff / #ffffff | 0 | #690004 / #690004 | 0 | 0 | 0 | 4.7 | 27.7 |
| Primary Container | #cc1e1c / #cc1e1c | 0 | #cc1e1c / #930008 | 12.2 | 0 | 11.3 | 28.5 | 47.8 |
| On Primary Container | #ffe2de / #ffe2de | 0 | #ffe2de / #ffdad5 | 2.8 | 12.2 | 12.2 | 86.2 | 84.2 |
| Secondary | #655f65 / #4d5660 | 9.1 | #bec7d4 / #bec7d4 | 0 | 10.4 | 13.6 | 5.2 | 9.6 |
| On Secondary | #ffffff / #ffffff | 0 | #28313b / #28313b | 0 | 0 | 0 | 3.5 | 14.1 |
| Secondary Container | #646d78 / #656e79 | 0.4 | #646d78 / #3f4852 | 13.2 | 0.4 | 12.9 | 28.4 | 46.2 |
| On Secondary Container | #e7effc / #e6effb | 0.8 | #e7effc / #dae3f0 | 2.7 | 6.9 | 6.9 | 85.3 | 84.1 |
| Tertiary | #565f6a / #565f6a | 0 | #bec7d4 / #bec7d4 | 0 | 13.6 | 16.8 | 5.2 | 9.6 |
| On Tertiary | #ffffff / #ffffff | 0 | #28313b / #28313b | 0 | 0 | 0 | 3.5 | 14.1 |
| Tertiary Container | #9ba4b0 / #9ba4b0 | 0 | #9ba4b0 / #3f4852 | 36.6 | 19.4 | 35.9 | 36.6 | 46.2 |
| On Tertiary Container | #313a44 / #313a44 | 0 | #313a44 / #dae3f0 | 60.6 | 65.4 | 65.4 | 81.4 | 84.1 |
| Error | #b1005e / #b1005e | 0 | #ffb1c8 / #ffb1c8 | 0 | 13.2 | 16.8 | 8.4 | 17.4 |
| On Error | #ffffff / #ffffff | 0 | #650033 / #650033 | 0 | 0 | 0 | 4.1 | 27.4 |
| Error Container | #de0077 / #de0077 | 0 | #de0077 / #8e004a | 16.6 | 2.2 | 15.8 | 28.7 | 47.1 |
| On Error Container | #fff7f7 / #fff7f7 | 0 | #fff7f7 / #ffd9e2 | 12.2 | 4 | 4 | 86.5 | 84.3 |
| Background | #f2efef / #fcf9f9 | 2.1 | #1f0f0d / #131314 | 9.1 | 1.8 | 1.8 | 9.1 | 9.1 |
| On Background | #281715 / #1b1b1c | 10.2 | #f1ebea / #e4e2e2 | 2.8 | 10.2 | 10.2 | 11.2 | 11.2 |
| Surface | #fafbfb / #fcf9f9 | 2 | #131314 / #131314 | 0 | 0 | 0 | 0 | 0 |
| On Surface | #1b1b1c / #1b1b1c | 0 | #e4e2e2 / #e4e2e2 | 0 | 2.9 | 5.9 | 6 | 6 |
| Surface Variant | #e0e3e3 / #e0e3e3 | 0 | #444748 / #444748 | 0 | 0 | 0 | 0 | 0 |
| On Surface Variant | #444748 / #444748 | 0 | #c4c7c8 / #c4c7c8 | 0 | 5.4 | 19.7 | 5.2 | 12.6 |
| Outline | #747878 / #747878 | 0 | #8e9192 / #8e9192 | 0 | 13.8 | 26 | 10.1 | 24.7 |
| Outline Variant | #c4c7c8 / #c4c7c8 | 0 | #444748 / #444748 | 0 | 28.6 | 46 | 28.3 | 46.6 |
| Surface Tint | #bd0f13 / #bd0f13 | 0 | #ffb4aa / #ffb4aa | 0 | 0 | 0 | 0 | 0 |
| Shadow | #000000 / #000000 | 0 | #000000 / #000000 | 0 | 0 | 0 | 0 | 0 |
| Scrim | #000000 / #000000 | 0 | #000000 / #000000 | 0 | 0 | 0 | 0 | 0 |
| Inverse Surface | #303031 / #303031 | 0 | #e4e2e2 / #e4e2e2 | 0 | 0 | 0 | 0 | 0 |
| Inverse On Surface | #f3f0f0 / #f3f0f1 | 0.5 | #303031 / #303031 | 0 | 0.5 | 3.4 | 1.9 | 12.5 |
| Inverse Primary | #ffb4aa / #ffb4aa | 0 | #bd0f13 / #ba1918 | 0.9 | 0 | 0 | 8 | 8 |
| Primary Fixed | #ffdad5 / #ffdad5 | 0 | #ffdad5 / #ffdad5 | 0 | 40.9 | 54.9 | 0 | 0 |
| On Primary Fixed | #410001 / #410001 | 0 | #410001 / #410001 | 0 | 88.1 | 88.1 | 6.2 | 23 |
| Primary Fixed Dim | #ffb4aa / #ffb4aa | 0 | #ffb4aa / #ffb4aa | 0 | 42.1 | 59.5 | 0 | 0 |
| On Primary Fixed Variant | #930008 / #930008 | 0 | #930008 / #930008 | 0 | 63.6 | 63.6 | 6.2 | 23.5 |
| Secondary Fixed | #dae3f0 / #dae3f0 | 0 | #dae3f0 / #dae3f0 | 0 | 34.8 | 51.5 | 0 | 0 |
| On Secondary Fixed | #141c25 / #141c25 | 0 | #141c25 / #141c25 | 0 | 85.6 | 85.6 | 2.9 | 8.7 |
| Secondary Fixed Dim | #bec7d4 / #bec7d4 | 0 | #bec7d4 / #bec7d4 | 0 | 39.6 | 59 | 0 | 0 |
| On Secondary Fixed Variant | #3f4852 / #3f4852 | 0 | #3f4852 / #3f4852 | 0 | 57.7 | 57.7 | 5.6 | 16.9 |
| Tertiary Fixed | #dae3f0 / - | - | #dae3f0 / - | - | - | - | - | - |
| On Tertiary Fixed | #141c25 / - | - | #141c25 / - | - | - | - | - | - |
| Tertiary Fixed Dim | #bec7d4 / - | - | #bec7d4 / - | - | - | - | - | - |
| On Tertiary Fixed Variant | #3f4852 / - | - | #3f4852 / - | - | - | - | - | - |
| Surface Dim | #dcd9da / #dcd9da | 0 | #131314 / #131314 | 0 | 4.7 | 8.2 | 0 | 0 |
| Surface Bright | #fbfafa / #fcf9f9 | 1 | #39393a / #39393a | 0 | 0 | 0 | 3.7 | 7.7 |
| Surface Container Lowest | #ffffff / #ffffff | 0 | #0e0e0f / #0e0e0f | 0 | 0 | 0 | 1.2 | 2.4 |
| Surface Container Low | #f6f3f3 / #f6f3f3 | 0 | #1b1b1c / #1b1b1c | 0 | 0 | 0.6 | 0.6 | 1.3 |
| Surface Container | #eae7e8 / #f0edee | 1.3 | #1f1f20 / #1f1f20 | 0 | 1.3 | 2.6 | 2.9 | 5.4 |
| Surface Container High | #e7e3e3 / #eae7e8 | 1 | #2a2a2b / #2a2a2b | 0 | 2.4 | 4.4 | 2.7 | 5.5 |
| Surface Container Highest | #e4e2e2 / #e4e2e2 | 0 | #353535 / #353535 | 0 | 3.9 | 6.6 | 2.9 | 5.8 |
