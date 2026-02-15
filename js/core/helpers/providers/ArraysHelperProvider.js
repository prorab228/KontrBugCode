class ArraysHelperProvider extends BaseHelperProvider {
   constructor() {
        super();
        this.methodMap = {
            'array_create': this.generateArrayHelpers,
            'array_output': this.generateArrayHelpers,
            'array_set': this.generateArrayHelpers,
            'array_get': this.generateArrayHelpers,
            'array_length': this.generateArrayHelpers,
            'array_find': this.generateArrayHelpers,
            'array_fill': this.generateArrayHelpers,
            'array_copy': this.generateArrayHelpers,
            'array_sum': this.generateArrayHelpers,
            'array_average': this.generateArrayHelpers,
            'array_min': this.generateArrayHelpers,
            'array_max': this.generateArrayHelpers,
            'array_from_string': this.generateArrayHelpers,
            'array_join': this.generateArrayHelpers,
            'array_reverse': this.generateArrayHelpers,
            'array_slice': this.generateArrayHelpers,
            'variables_declare_array': this.generateArrayHelpers,
            'array_literal': this.generateArrayHelpers
        };
    }

    // Добавьте эти функции в генерируемые вспомогательные функции:
generateArrayHelpers() {
    return `
// Вспомогательные функции для работы с массивами
template<typename T>
int findInArray(T arr[], int size, T value) {
    for (int i = 0; i < size; i++) {
        if (arr[i] == value) return i;
    }
    return -1;
}

template<typename T>
void fillArray(T arr[], int size, T value) {
    for (int i = 0; i < size; i++) {
        arr[i] = value;
    }
}

template<typename T>
void copyArray(T source[], T dest[], int size) {
    for (int i = 0; i < size; i++) {
        dest[i] = source[i];
    }
}

int arraySum(int arr[], int size) {
    int sum = 0;
    for (int i = 0; i < size; i++) {
        sum += arr[i];
    }
    return sum;
}

float arrayAverage(int arr[], int size) {
    if (size == 0) return 0;
    return (float)arraySum(arr, size) / size;
}

int arrayMin(int arr[], int size) {
    if (size == 0) return 0;
    int minVal = arr[0];
    for (int i = 1; i < size; i++) {
        if (arr[i] < minVal) minVal = arr[i];
    }
    return minVal;
}

int arrayMax(int arr[], int size) {
    if (size == 0) return 0;
    int maxVal = arr[0];
    for (int i = 1; i < size; i++) {
        if (arr[i] > maxVal) maxVal = arr[i];
    }
    return maxVal;
}

String arrayJoin(String arr[], int size, String delimiter) {
    String result = "";
    for (int i = 0; i < size; i++) {
        result += arr[i];
        if (i < size - 1) result += delimiter;
    }
    return result;
}

void reverseArray(int arr[], int size) {
    for (int i = 0; i < size / 2; i++) {
        int temp = arr[i];
        arr[i] = arr[size - 1 - i];
        arr[size - 1 - i] = temp;
    }
}

void sliceArray(int source[], int result[], int start, int end) {
    int j = 0;
    for (int i = start; i < end && i < sizeof(source)/sizeof(source[0]); i++) {
        result[j++] = source[i];
    }
}
`;
}
}