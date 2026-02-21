const fs = require("fs");
const path = require("path");
const https = require("https");

const baseUrl = "https://ia802800.us.archive.org/33/items/academictorrents_e8b1f9c5bf555fe58bc73addb83457dd6da69630/";
const videoPaths = [
    "01_I._Introduction_Week_1%2F01_Welcome_7_min.mp4",
    "01_I._Introduction_Week_1%2F02_What_is_Machine_Learning_7_min.mp4",
    "01_I._Introduction_Week_1%2F03_Supervised_Learning_12_min.mp4",
    "01_I._Introduction_Week_1%2F04_Unsupervised_Learning_14_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F01_Model_Representation_8_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F02_Cost_Function_8_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F03_Cost_Function_-_Intuition_I_11_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F04_Cost_Function_-_Intuition_II_9_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F05_Gradient_Descent_11_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F06_Gradient_Descent_Intuition_12_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F07_Gradient_Descent_For_Linear_Regression_10_min.mp4",
    "02_II._Linear_Regression_with_One_Variable_Week_1%2F08_Whats_Next_6_min.mp4",
    "03_III._Linear_Algebra_Review_Week_1_Optional%2F01_Matrices_and_Vectors_9_min.mp4",
    "03_III._Linear_Algebra_Review_Week_1_Optional%2F02_Addition_and_Scalar_Multiplication_7_min.mp4",
    "03_III._Linear_Algebra_Review_Week_1_Optional%2F03_Matrix_Vector_Multiplication_14_min.mp4",
    "03_III._Linear_Algebra_Review_Week_1_Optional%2F04_Matrix_Matrix_Multiplication_11_min.mp4",
    "03_III._Linear_Algebra_Review_Week_1_Optional%2F05_Matrix_Multiplication_Properties_9_min.mp4",
    "03_III._Linear_Algebra_Review_Week_1_Optional%2F06_Inverse_and_Transpose_11_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F01_Multiple_Features_8_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F02_Gradient_Descent_for_Multiple_Variables_5_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F03_Gradient_Descent_in_Practice_I_-_Feature_Scaling_9_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F04_Gradient_Descent_in_Practice_II_-_Learning_Rate_9_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F05_Features_and_Polynomial_Regression_8_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F06_Normal_Equation_16_min.mp4",
    "04_IV._Linear_Regression_with_Multiple_Variables_Week_2%2F07_Normal_Equation_Noninvertibility_Optional_6_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F01_Basic_Operations_14_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F02_Moving_Data_Around_16_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F03_Computing_on_Data_13_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F04_Plotting_Data_10_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F05_Control_Statements-_for_while_if_statements_13_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F06_Vectorization_14_min.mp4",
    "05_V._Octave_Tutorial_Week_2%2F07_Working_on_and_Submitting_Programming_Exercises_4_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F01_Classification_8_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F02_Hypothesis_Representation_7_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F03_Decision_Boundary_15_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F04_Cost_Function_11_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F05_Simplified_Cost_Function_and_Gradient_Descent_10_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F06_Advanced_Optimization_14_min.mp4",
    "06_VI._Logistic_Regression_Week_3%2F07_Multiclass_Classification-_One-vs-all_6_min.mp4",
    "07_VII._Regularization_Week_3%2F01_The_Problem_of_Overfitting_10_min.mp4",
    "07_VII._Regularization_Week_3%2F02_Cost_Function_10_min.mp4",
    "07_VII._Regularization_Week_3%2F03_Regularized_Linear_Regression_11_min.mp4",
    "07_VII._Regularization_Week_3%2F04_Regularized_Logistic_Regression_9_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F01_Non-linear_Hypotheses_10_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F02_Neurons_and_the_Brain_8_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F03_Model_Representation_I_12_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F04_Model_Representation_II_12_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F05_Examples_and_Intuitions_I_7_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F06_Examples_and_Intuitions_II_10_min.mp4",
    "08_VIII._Neural_Networks-_Representation_Week_4%2F07_Multiclass_Classification_4_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F01_Cost_Function_7_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F02_Backpropagation_Algorithm_12_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F03_Backpropagation_Intuition_13_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F04_Implementation_Note-_Unrolling_Parameters_8_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F05_Gradient_Checking_12_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F06_Random_Initialization_7_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F07_Putting_It_Together_14_min.mp4",
    "09_IX._Neural_Networks-_Learning_Week_5%2F08_Autonomous_Driving_7_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F01_Deciding_What_to_Try_Next_6_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F02_Evaluating_a_Hypothesis_8_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F03_Model_Selection_and_Train-Validation-Test_Sets_12_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F04_Diagnosing_Bias_vs._Variance_8_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F05_Regularization_and_Bias-Variance_11_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F06_Learning_Curves_12_min.mp4",
    "10_X._Advice_for_Applying_Machine_Learning_Week_6%2F07_Deciding_What_to_Do_Next_Revisited_7_min.mp4",
    "11_XI._Machine_Learning_System_Design_Week_6%2F01_Prioritizing_What_to_Work_On_10_min.mp4",
    "11_XI._Machine_Learning_System_Design_Week_6%2F02_Error_Analysis_13_min.mp4",
    "11_XI._Machine_Learning_System_Design_Week_6%2F03_Error_Metrics_for_Skewed_Classes_12_min.mp4",
    "11_XI._Machine_Learning_System_Design_Week_6%2F04_Trading_Off_Precision_and_Recall_14_min.mp4",
    "11_XI._Machine_Learning_System_Design_Week_6%2F05_Data_For_Machine_Learning_11_min.mp4",
    "12_XII._Support_Vector_Machines_Week_7%2F01_Optimization_Objective_15_min.mp4",
    "12_XII._Support_Vector_Machines_Week_7%2F02_Large_Margin_Intuition_11_min.mp4",
    "12_XII._Support_Vector_Machines_Week_7%2F03_Mathematics_Behind_Large_Margin_Classification_Optional_20_min.mp4",
    "12_XII._Support_Vector_Machines_Week_7%2F04_Kernels_I_16_min.mp4",
    "12_XII._Support_Vector_Machines_Week_7%2F05_Kernels_II_16_min.mp4",
    "12_XII._Support_Vector_Machines_Week_7%2F06_Using_An_SVM_21_min.mp4",
    "13_XIII._Clustering_Week_8%2F01_Unsupervised_Learning-_Introduction_3_min.mp4",
    "13_XIII._Clustering_Week_8%2F02_K-Means_Algorithm_13_min.mp4",
    "13_XIII._Clustering_Week_8%2F03_Optimization_Objective_7_min.mp4",
    "13_XIII._Clustering_Week_8%2F04_Random_Initialization_8_min.mp4",
    "13_XIII._Clustering_Week_8%2F05_Choosing_the_Number_of_Clusters_8_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F01_Motivation_I-_Data_Compression_10_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F02_Motivation_II-_Visualization_6_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F03_Principal_Component_Analysis_Problem_Formulation_9_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F04_Principal_Component_Analysis_Algorithm_15_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F05_Choosing_the_Number_of_Principal_Components_11_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F06_Reconstruction_from_Compressed_Representation_4_min.mp4",
    "14_XIV._Dimensionality_Reduction_Week_8%2F07_Advice_for_Applying_PCA_13_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F01_Problem_Motivation_8_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F02_Gaussian_Distribution_10_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F03_Algorithm_12_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F04_Developing_and_Evaluating_an_Anomaly_Detection_System_13_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F05_Anomaly_Detection_vs._Supervised_Learning_8_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F06_Choosing_What_Features_to_Use_12_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F07_Multivariate_Gaussian_Distribution_Optional_14_min.mp4",
    "15_XV._Anomaly_Detection_Week_9%2F08_Anomaly_Detection_using_the_Multivariate_Gaussian_Distribution_Optional_14_min.mp4",
    "16_XVI._Recommender_Systems_Week_9%2F01_Problem_Formulation_8_min.mp4",
    "16_XVI._Recommender_Systems_Week_9%2F02_Content_Based_Recommendations_15_min.mp4",
    "16_XVI._Recommender_Systems_Week_9%2F03_Collaborative_Filtering_10_min.mp4",
    "16_XVI._Recommender_Systems_Week_9%2F04_Collaborative_Filtering_Algorithm_9_min.mp4",
    "16_XVI._Recommender_Systems_Week_9%2F05_Vectorization-_Low_Rank_Matrix_Factorization_8_min.mp4",
    "16_XVI._Recommender_Systems_Week_9%2F06_Implementational_Detail-_Mean_Normalization_9_min.mp4",
    "17_XVII._Large_Scale_Machine_Learning_Week_10%2F01_Learning_With_Large_Datasets_6_min.mp4",
    "17_XVII._Large_Scale_Machine_Learning_Week_10%2F02_Stochastic_Gradient_Descent_13_min.mp4",
    "17_XVII._Large_Scale_Machine_Learning_Week_10%2F03_Mini-Batch_Gradient_Descent_6_min.mp4",
    "17_XVII._Large_Scale_Machine_Learning_Week_10%2F04_Stochastic_Gradient_Descent_Convergence_12_min.mp4",
    "17_XVII._Large_Scale_Machine_Learning_Week_10%2F05_Online_Learning_13_min.mp4",
    "17_XVII._Large_Scale_Machine_Learning_Week_10%2F06_Map_Reduce_and_Data_Parallelism_14_min.mp4",
    "18_XVIII._Application_Example-_Photo_OCR%2F01_Problem_Description_and_Pipeline_7_min.mp4",
    "18_XVIII._Application_Example-_Photo_OCR%2F02_Sliding_Windows_15_min.mp4",
    "18_XVIII._Application_Example-_Photo_OCR%2F03_Getting_Lots_of_Data_and_Artificial_Data_16_min.mp4",
    "18_XVIII._Application_Example-_Photo_OCR%2F04_Ceiling_Analysis-_What_Part_of_the_Pipeline_to_Work_on_Next_14_min.mp4",
    "19_XIX._Conclusion%2F01_Summary_and_Thank_You_5_min.mp4",
]

// Max parallel downloads
const MAX_PARALLEL = 10;

// ----------------------------
// HELPERS
// ----------------------------
function downloadFile(url, savePath) {
  return new Promise((resolve, reject) => {
    console.log("⬇️  Downloading:", url);

    // Ensure folder exists
    fs.mkdirSync(path.dirname(savePath), { recursive: true });

    const file = fs.createWriteStream(savePath);
    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`Failed with status ${res.statusCode}`));
        return;
      }

      res.pipe(file);
      file.on("finish", () => {
        file.close(() => {
          console.log("✅ Saved:", savePath);
          resolve();
        });
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

async function runDownloads() {
  const queue = videoPaths.map((p, i) => ({ index: i + 1, path: p }));

  async function worker() {
    while (queue.length > 0) {
      const item = queue.shift();
      const fullUrl = baseUrl + item.path;

      // Name files as "1.mp4", "2.mp4", etc.
      const fileName = item.index + ".mp4";

      const savePath = path.join(__dirname, "ML_andrew", fileName);

      try {
        await downloadFile(fullUrl, savePath);
      } catch (err) {
        console.error("❌ Error:", err.message);
      }
    }
  }

  const workers = [];
  for (let i = 0; i < MAX_PARALLEL; i++) {
    workers.push(worker());
  }

  await Promise.all(workers);
  console.log("🎉 All downloads finished!");
}


runDownloads();
