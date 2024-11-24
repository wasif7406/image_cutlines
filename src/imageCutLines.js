const { Image } = require('image-js');

async function removeAlphaChannel(image) {
    try {
        // Create a new image without the alpha channel
        const { width, height } = image;
        const newImage = new Image(width, height);

        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = image.getPixelXY(x, y);
                const [r, g, b, a] = pixel;

                // Set the new pixel without the alpha channel
                if (a === 0) {
                    newImage.setPixelXY(x, y, [255, 255, 255, 255]);
                } else {
                    newImage.setPixelXY(x, y, [r, g, b, 255]);
                }
            }
        }

        console.log('Alpha channel removed successfully!');
        return newImage; // Return the new image without the alpha channel
    } catch (error) {
        console.error('Error:', error);
        return image; // Return the original image in case of an error
    }
}

async function resizeImage(image) {
    const originalWidth = image.width;
    const originalHeight = image.height;
    const paddedWidth = 30;
    const targetWidth = 300 - 2 * paddedWidth;
    const scaleFactor = targetWidth / originalWidth;
    const targetHeight = Math.round(originalHeight * scaleFactor);

    const borderSize = paddedWidth;


    // Resize the original image
    const resizedImage = await image.resize({ width: targetWidth, height: targetHeight });

    // Create a new Image with the border
    const borderedImage = new Image(targetWidth + 2 * borderSize, targetHeight + 2 * borderSize);

    // Loop through the bordered image, setting pixels from the resized image or white color
    for (let y = 0; y < borderedImage.height; y++) {
        for (let x = 0; x < borderedImage.width; x++) {
            if (x >= borderSize && x < borderSize + resizedImage.width &&
                y >= borderSize && y < borderSize + resizedImage.height) {
                const resizedX = x - borderSize;
                const resizedY = y - borderSize;
                const pixelValue = resizedImage.getPixelXY(resizedX, resizedY);
                borderedImage.setPixelXY(x, y, pixelValue);
            } else {
                borderedImage.setPixelXY(x, y, [255, 255, 255]);
            }
        }
    }

    return borderedImage;
}

async function makeNonWhitePixelsBlack(inputImage) {

    const outputImage = new Image(inputImage.width, inputImage.height);
    try {
        // Iterate through all pixels of the image
        for (let y = 0; y < inputImage.height; y++) {
            for (let x = 0; x < inputImage.width; x++) {
                const pixel = inputImage.getPixelXY(x, y);

                // Check if the pixel is not white (assuming white is [255, 255, 255])
                if (!isPixelWhite(pixel)) {
                    // Set the color of the non-white pixel to black [0, 0, 0]
                    outputImage.setPixelXY(x, y, [0, 0, 0]);
                } else {
                    outputImage.setPixelXY(x, y, [255, 255, 255]);
                }
            }
        }

        console.log('Non-white pixels converted to black successfully!');
        return outputImage; // Return the modified image
    } catch (error) {
        console.error('Error:', error);
        return inputImage; // Return the original image in case of an error
    }
}


function validCoordinates(width, height, row, col) {
    return row >= 0 && row < height && col >= 0 && col < width;
}


function createMatrix(rows, columns) {
    const matrix = [];

    for (let i = 0; i < rows; i++) {
        const row = [];
        for (let j = 0; j < columns; j++) {
            row.push(0);
        }
        matrix.push(row);
    }

    return matrix;
}

function floodFill(imageData, startx, starty) {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const binaryOut = createMatrix(height, width)


    const fillStack = [[starty, startx]];
    const startColor = {
        r: data[(starty * width + startx) * 4],
        g: data[(starty * width + startx) * 4 + 1],
        b: data[(starty * width + startx) * 4 + 2],
        a: 255,
    };

    while (fillStack.length > 0) {
        const [row, col] = fillStack.pop();

        if (!validCoordinates(width, height, row, col)) {
            continue;
        }

        const pixelIndex = (row * width + col) * 4;
        const currentColor = {
            r: data[pixelIndex],
            g: data[pixelIndex + 1],
            b: data[pixelIndex + 2],
            a: 255,
        };

        if (JSON.stringify(currentColor) !== JSON.stringify(startColor)) {
            continue;
        }

        if (binaryOut[row][col] === 1) {
            continue;
        }

        binaryOut[row][col] = 1;

        fillStack.push([row + 1, col]);
        fillStack.push([row - 1, col]);
        fillStack.push([row, col + 1]);
        fillStack.push([row, col - 1]);
    }
    return binaryOut;
}


async function applyMask(imageData) {
    const matrix = floodFill(imageData, 0, 0);
    const maskedImage = new Image(imageData.width, imageData.height);

    // Loop through the image data and apply the mask
    for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
            const pixelValue = matrix[y][x];
            if (pixelValue === 0) {
                // Set the pixel color to black (all RGBA values to 0)
                maskedImage.setPixelXY(x, y, [0, 0, 0]);
                // You can also optionally set imageData.data[index + 3] to 0 if you want to make the pixel completely transparent.
            } else {
                maskedImage.setPixelXY(x, y, [255, 255, 255]);
            }
        }
    }
    return maskedImage;
}

// Helper function to check if a pixel is white
function isPixelWhite(pixel) {
    const [r, g, b] = pixel;
    return r === 255 && g === 255 && b === 255;
}


// Helper function to check if a pixel is black
function isPixelBlack(pixel) {
    const [r, g, b] = pixel;
    return r === 0 && g === 0 && b === 0;
}

// Function to check if any neighboring pixels are white
function hasNeighboringWhitePixel(imageData, x, y) {
    const width = imageData.width;
    const height = imageData.height;

    for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
            const neighborX = x + dx;
            const neighborY = y + dy;

            if (neighborX >= 0 && neighborX < width && neighborY >= 0 && neighborY < height) {
                const pixel = imageData.getPixelXY(neighborX, neighborY);

                if (isPixelWhite(pixel)) {
                    return true;
                }
            }
        }
    }

    return false;
}

// Helper function to calculate distance between two points (pixels)
function calculateDistance(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}

async function increaseObjectSize(imageData, padding) {
    try {
        const { width, height } = imageData;

        // Create a new Image object for the enlarged data
        const enlargedData = new Image(width, height);
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                enlargedData.setPixelXY(x, y, [255, 255, 255]);
            }
        }

        // Iterate through all pixels of the image
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                const pixel = imageData.getPixelXY(x, y);

                // Check if the pixel is black
                if (isPixelBlack(pixel) && hasNeighboringWhitePixel(imageData, x, y)) {
                    // Set the color of the black pixel in the enlarged data
                    enlargedData.setPixelXY(x, y, [0, 0, 0]);

                    // Create a circle of specified radius (padding) around the black pixel
                    for (let dy = -padding; dy <= padding; dy++) {
                        for (let dx = -padding; dx <= padding; dx++) {
                            const newX = x + dx;
                            const newY = y + dy;

                            // Check if the new coordinates are within the image boundaries
                            if (newX >= 0 && newX < width && newY >= 0 && newY < height) {
                                // Check if the pixel is inside the circle using distance calculation
                                if (calculateDistance(x, y, newX, newY) <= padding) {
                                    // Set the color of the pixel inside the circle to black
                                    enlargedData.setPixelXY(newX, newY, [0, 0, 0]);
                                }
                            }
                        }
                    }
                }
            }
        }

        console.log('Object size increased successfully!');
        return enlargedData; // Return the modified image with increased object size
    } catch (error) {
        console.error('Error:', error);
        return imageData; // Return the original image in case of an error
    }
}

// Helper function to convert an RGB pixel to grayscale
function rgbToGray(pixel) {
    const [r, g, b] = pixel;
    // Use luminosity method to calculate grayscale value
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

async function extractEdges(imageData, edgeThreshold) {
    try {
        const { width, height } = imageData;

        // Create a new Image object for the edge data
        const edgeData = new Image(width, height);

        // Iterate through all pixels of the image
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Get the grayscale value of the pixel
                const grayValue = rgbToGray(imageData.getPixelXY(x, y));

                // Set the grayscale value as the color of the pixel in the edge data
                edgeData.setPixelXY(x, y, [grayValue, grayValue, grayValue]);
            }
        }

        // Apply Sobel operator to find the gradients in both horizontal and vertical directions
        const sobelX = [
            [-1, 0, 1],
            [-2, 0, 2],
            [-1, 0, 1],
        ];

        const sobelY = [
            [-1, -2, -1],
            [0, 0, 0],
            [1, 2, 1],
        ];

        for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
                let sumX = 0;
                let sumY = 0;

                // Convolution with the Sobel kernels
                for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                        const grayValue = rgbToGray(imageData.getPixelXY(x + dx, y + dy));

                        sumX += grayValue * sobelX[dy + 1][dx + 1];
                        sumY += grayValue * sobelY[dy + 1][dx + 1];
                    }
                }

                // Calculate the magnitude of the gradient
                const magnitude = Math.sqrt(sumX ** 2 + sumY ** 2);

                // Set the magnitude as the color of the pixel in the edge data
                //edgeData.setPixelXY(x, y, [magnitude, magnitude, magnitude]);
                // Set the color of the pixel based on the magnitude
                if (magnitude >= edgeThreshold) {
                    // Edge pixel: set color to black
                    edgeData.setPixelXY(x, y, [0, 0, 0]);
                } else {
                    // Background pixel: set color to white
                    edgeData.setPixelXY(x, y, [255, 255, 255]);
                }
            }
        }

        console.log('Edges extracted successfully!');
        return edgeData; // Return the edge data as a new image
    } catch (error) {
        console.error('Error:', error);
        return imageData; // Return the original image in case of an error
    }
}

function findFirstBlackPixel(imageData) {
    const width = imageData.width;
    const height = imageData.height;

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelColor = imageData.getPixelXY(x, y);

            // Check if the pixel is black
            if (pixelColor[0] === 0 && pixelColor[1] === 0 && pixelColor[2] === 0) {
                return { x, y }; // Return the coordinates of the black pixel
            }
        }
    }

    console.error('No black pixel found in the image.');
    return null;
}

function calculateTangentVector(edgeImageData, x, y) {
    const width = edgeImageData.width;
    const height = edgeImageData.height;

    if (x < 1 || x >= width - 1 || y < 1 || y >= height - 1) {
        console.error('Invalid point coordinates. Point must be within the image bounds.');
        if (x < 1 || x >= width - 1) {
            return [0, 1];
        } else if (y < 1 || y >= height - 1) {
            return [1, 0];
        }
    }

    // Get the gradient values for the x and y directions at the given point
    const sobelX = [
        [-1, 0, 1],
        [-2, 0, 2],
        [-1, 0, 1],
    ];

    const sobelY = [
        [-1, -2, -1],
        [0, 0, 0],
        [1, 2, 1],
    ];

    let sumX = 0;
    let sumY = 0;

    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
            const grayValue = edgeImageData.getPixelXY(x + dx, y + dy)[0];

            sumX += grayValue * sobelX[dy + 1][dx + 1];
            sumY += grayValue * sobelY[dy + 1][dx + 1];
        }
    }

    // Calculate the magnitude of the gradient
    const magnitude = Math.sqrt(sumX ** 2 + sumY ** 2);

    // Calculate the normalized tangent vector
    const tangentX = -sumY / magnitude;
    const tangentY = sumX / magnitude;

    return [tangentX, tangentY];
}

async function mergeImagesWithTangent(firstImageData, secondImageData, baseImage) {
    // Step 1: Find the point on the first image where the center of the second image will be placed
    const centerPixel = findFirstBlackPixel(firstImageData);
    //console.log(centerPixel);
    if (!centerPixel) {
        console.error('No black pixel found on the first image.');
        return null;
    }

    // Step 2: Calculate the tangent vector at the point found above
    const tangentVector = calculateTangentVector(firstImageData, centerPixel.x, centerPixel.y);
    //const tangentVector = [1,0];
    //console.log(tangentVector);
    if (!tangentVector) {
        console.error('Unable to calculate the tangent vector.');
        return null;
    }

    // Step 3: Calculate the rotation angle
    const angle = Math.acos(tangentVector[1] / Math.sqrt(tangentVector[0] ** 2 + tangentVector[1] ** 2)) - 0.3;
    //console.log(angle);


    // Create a copy of the first image to store the merged data
    //const mergedImageData = new Image(firstImageData.width, firstImageData.height);
    const mergedImageData = baseImage;

    // Iterate over the dataSecond and copy black pixels to the merged image
    for (let y = 0; y < secondImageData.height; y++) {
        for (let x = 0; x < secondImageData.width; x++) {
            const pixelColor = secondImageData.getPixelXY(x, y);

            if (pixelColor[0] === 0 && pixelColor[1] === 0 && pixelColor[2] === 0) {
                const targetX = Math.round(centerPixel.x + ((x - secondImageData.width / 2) * Math.cos(angle) - (y - secondImageData.height / 2) * Math.sin(angle)) / 3);
                const targetY = Math.round(centerPixel.y + ((x - secondImageData.width / 2) * Math.sin(angle) + (y - secondImageData.height / 2) * Math.cos(angle)) / 3);

                if (targetX >= 0 && targetX < firstImageData.width && targetY >= 0 && targetY < firstImageData.height) {
                    mergedImageData.setPixelXY(targetX, targetY, [0, 0, 0]);
                }
            }
        }
    }

    console.log('Images merged with tangent successfully!');
    return mergedImageData;
}


async function convertToDashedEdge(imageData, dashLength = 5, gapLength = 5) {
    try {
        const { width, height } = imageData;

        // Create a new Image object for the dashed edge data
        const dashedEdgeData = new Image(width, height);

        // Iterate through all pixels of the image
        for (let y = 0; y < height; y++) {
            for (let x = 0; x < width; x++) {
                // Get the color of the pixel in the original edge image
                const pixel = imageData.getPixelXY(x, y);
                const [r, g, b] = pixel;

                // If the pixel is part of the edge (black color), apply dash pattern
                if (r === 0 && g === 0 && b === 0) {
                    // Calculate the position within the dash + gap pattern
                    const position = (x + y) % (dashLength + gapLength);

                    // Set the pixel color based on the dash position
                    if (position < dashLength) {
                        dashedEdgeData.setPixelXY(x, y, [0, 0, 0]); // Dash (black)
                    } else {
                        dashedEdgeData.setPixelXY(x, y, [255, 255, 255]); // Gap (white)
                    }
                } else {
                    // For non-edge pixels, copy their color to the dashed edge data
                    dashedEdgeData.setPixelXY(x, y, pixel);
                }
            }
        }

        console.log('Edges converted to dashed edges successfully!');
        return dashedEdgeData; // Return the dashed edge data as a new image
    } catch (error) {
        console.error('Error:', error);
        return imageData; // Return the original image in case of an error
    }
}



function mergeImages(firstImage, secondImage) {
    const width = firstImage.width;
    const height = firstImage.height;
    const mergedImage = new Image(width, height);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const pixelValue = firstImage.getPixelXY(x, y);
            const [r2, g2, b2] = secondImage.getPixelXY(x, y);

            // Check if the pixel in the second image is black (r, g, b = 0, 0, 0)
            if (r2 == !255 && g2 == !255 && b2 == !255) {
                // Replace the corresponding pixel in the first image
                mergedImage.setPixelXY(x, y, [0, 0, 0]);
            } else {
                mergedImage.setPixelXY(x, y, pixelValue);
            }
        }
    }
    return mergedImage;
}

export async function imageCutLines(imagePath, scissorsImgPath, padding, edgeThreshold, dashLength, gapLength) {
    try {
        // Load the image
        const image = await Image.load(imagePath);
        const scissorsImg = await Image.load(scissorsImgPath);

        // Resize the image
        const resizedImage = await resizeImage(image);

        // Stage 1: Remove the alpha channel from the image
        const imageWithoutAlpha = await removeAlphaChannel(resizedImage);

        // Stage 2: Convert non-white pixels to black
        const blackWhiteImage = await makeNonWhitePixelsBlack(imageWithoutAlpha);

        // Increase the object size with a specified padding
        const closedImage = await increaseObjectSize(blackWhiteImage, padding);

        const withoutHoles = await applyMask(closedImage);

        // Stage 3: Extract edges from the modified image and make them black
        const edgeImage = await extractEdges(withoutHoles, edgeThreshold);

        // Stage 4: Convert the edge image to dashed edges
        const dashedEdgeImage = await convertToDashedEdge(edgeImage, dashLength, gapLength);

        const mergedScissorImage = await mergeImagesWithTangent(edgeImage, scissorsImg, dashedEdgeImage)

        const mergedImage = mergeImages(resizedImage, mergedScissorImage);

        // Save the final output with the original image above the dashed edges
        //await mergedImage.save(outputPath);
        console.log('Edge extraction, dashed edge conversion, and merging completed successfully!');
        return {
            "originalImage": resizedImage,
            "finalImage": mergedImage
        };


    } catch (error) {
        console.error('Error:', error);
        return null;
    }
}
// Usage example:
//main('./input_404.jpg', './out_404.jpg', 10, 50, 10, 10);
