  /* ===================== PURE MACRO MODEL =====================
     DOM-free so boundary cases can be tested in Node. Protein and fat scale
     from body weight rather than calories; a BMI-30 reference cap prevents
     extreme prescriptions when total weight is a poor lean-mass proxy. */
  function ffRound5(n){ return Math.round(n/5)*5; }
  function ffClamp(n,min,max){ return Math.max(min,Math.min(max,n)); }
  function ffMacroTargets(input){
    var weightLb=Math.max(0,Number(input.weightLb)||0);
    var heightCm=Math.max(0,Number(input.heightCm)||0);
    var target=Math.max(0,Number(input.targetKcal)||0)+(Number(input.kcalAdj)||0);
    var proteinPerLb=Number(input.proteinPerLb)||0.9;
    var fatPerLb=Number(input.fatPerLb)||0.35;
    var heightM=heightCm/100;
    var bmi30Lb=heightM>0 ? 30*heightM*heightM*2.20462 : weightLb;
    var referenceLb=Math.min(weightLb,bmi30Lb||weightLb);
    var proteinG=ffRound5(referenceLb*proteinPerLb);
    var fatG=ffRound5(ffClamp(referenceLb*fatPerLb,45,100));
    var carbG=ffRound5(Math.max(0,(target-proteinG*4-fatG*9)/4));
    return { target:target, referenceLb:referenceLb, proteinG:proteinG, fatG:fatG, carbG:carbG,
      proteinKcal:proteinG*4, fatKcal:fatG*9, carbKcal:carbG*4 };
  }
