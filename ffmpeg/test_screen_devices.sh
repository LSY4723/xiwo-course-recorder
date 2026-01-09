#!/bin/bash

# 测试 macOS 屏幕录制
# 尝试不同的设备编号
for i in {0..5}
do
    echo "测试设备编号 $i..."
    ./ffmpeg -f avfoundation -framerate 30 -pixel_format uyvy422 -i "$i:none" -c:v libx264 -preset ultrafast -crf 23 -t 5 test_screen_$i.mp4
    echo "------------------------"
done

echo "测试完成。请检查生成的 test_screen_*.mp4 文件，找到包含屏幕内容的文件。"
echo "如果 test_screen_0.mp4 包含屏幕内容，说明修改有效。"
echo "如果 test_screen_1.mp4 包含屏幕内容，说明需要将代码改回使用 displayIndex + 1。"